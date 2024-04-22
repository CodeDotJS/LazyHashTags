document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const cardContainer = document.getElementById('card-container');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const selectedHashtagsList = document.getElementById('selected-hashtags-list');
    const copySelectedBtn = document.getElementById('copy-selected-btn');

    let imageQueue = [];
    let isProcessing = false;
    let currentIndex = 0;
    const cards = [];
    const imagePreviewElements = [];
    const uploadStatus = document.getElementById('upload-status');

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    copySelectedBtn.addEventListener('click', copySelectedHashtags);

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    function handleDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    imageQueue.push({ imageData: reader.result, file });
                    updateUploadStatus();
                    processQueue();
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please select a valid image file.');
            }
        });
    }

    function updateUploadStatus() {
     const totalImages = imageQueue.length + cards.length;
     const currentImageIndex = totalImages - imageQueue.length;
     const statusText = imageQueue.length === 0 ? 'Uploaded' : 'Uploading';
     const loaderText = `${statusText} ${currentImageIndex} of ${totalImages} Image${totalImages !== 1 ? 's' : ''}`;

     uploadStatus.textContent = loaderText;

     if (imageQueue.length > 0) {
         const loader = document.querySelector('.dots-container');
         loader.style.display = 'flex';
     } else {
         const loader = document.querySelector('.dots-container');
         loader.style.display = 'none';
     }
 }

    function processQueue() {
        if (isProcessing || imageQueue.length === 0) {
            return;
        }

        isProcessing = true;
        const batchSize = 3;
        const batch = imageQueue.splice(0, batchSize);

        Promise.all(batch.map(({ imageData, file }) => createImagePreview(imageData, file)))
            .then(() => {
                isProcessing = false;
                updateUploadStatus();
                processQueue();
            })
            .catch(error => {
                console.error('Error processing image batch:', error);
                isProcessing = false;
                updateUploadStatus();
                processQueue();
            });
    }

    function createImagePreview(imageData, file) {
        const previewElement = document.createElement('div');
        previewElement.classList.add('image-preview');

        const container = document.querySelector('.container');
        container.classList.add('auto-height');

        const img = document.createElement('img');
        img.src = imageData;
        previewElement.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-btn');
        removeBtn.innerHTML = '&times;';

        removeBtn.addEventListener('click', () => {
            removeImagePreview(previewElement);
        });

        previewElement.appendChild(removeBtn);

        imagePreviewContainer.appendChild(previewElement);
        imagePreviewElements.push(previewElement);

        return createCard(imageData, previewElement, file).then(card => {
            previewElement.card = card;
            previewElement.addEventListener('click', () => {
                showCard(card);
            });
            return card;
        });
    }

    function removeImagePreview(previewElement) {
        const cardIndex = cards.findIndex(card => card === previewElement.card);
        if (cardIndex !== -1) {
            cards.splice(cardIndex, 1);
            cardContainer.removeChild(previewElement.card);
        }

        const previewIndex = imagePreviewElements.indexOf(previewElement);
        if (previewIndex !== -1) {
            imagePreviewElements.splice(previewIndex, 1);
            imagePreviewContainer.removeChild(previewElement);
        }

        if (currentIndex >= cards.length) {
            currentIndex = cards.length - 1;
        }

        showCard(cards[currentIndex]);
        updateUploadStatus();
    }

    async function createCard(imageData, previewElement, file) {
        const card = document.createElement('div');
        card.classList.add('card');

        const img = document.createElement('img');
        img.src = imageData;
        card.appendChild(img);

        const hashtagContainer = document.createElement('div');
        hashtagContainer.classList.add('hashtag-container');

        const hashtagList = document.createElement('div');
        hashtagList.classList.add('hashtag-list');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await axios.post('/tags', formData);

            if (response.status === 200) {
                const data = response.data;
                console.log(data)
                const tags = data.tags;
                const limitedTags = tags.slice(0, 28);

                limitedTags.forEach(tag => {
                    const formattedTag = tag.replace(/\s+/g, '_');
                    const hashtagSpan = document.createElement('span');
                    hashtagSpan.textContent = `#${formattedTag}`;
                    hashtagList.appendChild(hashtagSpan);
                    hashtagSpan.addEventListener('click', handleHashtagClick);
                });
            } else {
                console.error('Failed to fetch tags from API');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }

        hashtagContainer.appendChild(hashtagList);

        const copyBtn = document.createElement('button');
        copyBtn.classList.add('copy-btn');
        copyBtn.textContent = 'COPY';

        copyBtn.addEventListener('click', () => {
            const hashtags = Array.from(hashtagList.querySelectorAll('span')).map(span => span.textContent).join(' ');
            navigator.clipboard.writeText(hashtags);
            copyBtn.textContent = 'COPIED';
        });

        hashtagContainer.appendChild(copyBtn);
        card.appendChild(hashtagContainer);

        cards.push(card);
        cardContainer.appendChild(card);
        showCard(card);

        if (previewElement) {
            previewElement.classList.add('active');
        }

        const selectedHashtags = document.querySelector('.selected-hashtags');
        selectedHashtags.style.display = 'flex';

        return card;
    }

    function showCard(card) {
        const cards = document.querySelectorAll('#card-container .card');
        cards.forEach(c => {
            c.classList.remove('active');
        });

        card.classList.add('active');

        imagePreviewElements.forEach(preview => {
            preview.classList.remove('active');
            if (preview.card === card) {
                preview.classList.add('active');
            }
        });
    }

    function handleHashtagClick(e) {
        const hashtag = e.target.textContent;
        const isAlreadyAdded = Array.from(selectedHashtagsList.children).some(child => child.textContent === hashtag);

        if (!isAlreadyAdded) {
            const hashtagSpan = document.createElement('span');
            hashtagSpan.textContent = hashtag;
            hashtagSpan.addEventListener('click', handleRemoveHashtag);
            selectedHashtagsList.appendChild(hashtagSpan);
            e.target.classList.add('selected');
        } else {
            e.target.classList.remove('selected');
            const selectedHashtag = Array.from(selectedHashtagsList.children).find(child => child.textContent === hashtag);
            selectedHashtagsList.removeChild(selectedHashtag);
        }
    }

    function handleRemoveHashtag(e) {
        const hashtag = e.target;
        selectedHashtagsList.removeChild(hashtag);
        const correspondingHashtag = Array.from(document.querySelectorAll('.hashtag-list span')).find(span => span.textContent === hashtag.textContent);
        if (correspondingHashtag) {
            correspondingHashtag.classList.remove('selected');
        }
    }

    function copySelectedHashtags() {
        const selectedHashtags = Array.from(selectedHashtagsList.children).map(span => span.textContent).join(' ');
        navigator.clipboard.writeText(selectedHashtags);
        copySelectedBtn.textContent = 'COPIED';
        copySelectedBtn.classList.add('copied');
        setTimeout(() => {
            copySelectedBtn.textContent = 'COPY SELECTED';
            copySelectedBtn.classList.remove('copied');
        }, 2000);
    }
});
