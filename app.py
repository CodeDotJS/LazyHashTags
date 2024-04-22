from flask import Flask, request, jsonify, render_template
import requests
import os
import base64
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

AUTH_KEY = os.getenv('AUTH_KEY')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/tags', methods=['POST'])
def get_tags():
    file = request.files['image']
    formData = {
        'image': file
    }

    try:
        if AUTH_KEY is not None:
            auth_key_bytes = AUTH_KEY.encode('utf-8')
            encoded_auth_key = base64.b64encode(auth_key_bytes).decode('utf-8')
            headers = {
                'Authorization': 'Basic ' + encoded_auth_key
            }
        else:
            return jsonify({'error': 'AUTH_KEY is not set'}), 500

        response = requests.post('https://api.imagga.com/v2/tags', files=formData, headers=headers)

        if response.status_code == 200:
            data = response.json()
            tags = [tag['tag']['en'] for tag in data['result']['tags']]
            return jsonify({'tags': tags}), 200
        else:
            return jsonify({'error': 'Failed to fetch tags from Imagga API'}), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
