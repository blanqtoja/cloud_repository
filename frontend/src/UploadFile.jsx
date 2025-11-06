import React, { useState } from 'react';

const API_URL = 'http://localhost:3000';

export default function UploadFile() {
	const [selectedFile, setSelectedFile] = useState(null);
	const [uploadMessage, setUploadMessage] = useState('');

	// handler activated by clicking on send button
	const handleFileChange = event => {
		setSelectedFile(event.target.files[0]);
		setUploadMessage('');
	};

	// handler on upload file
	const handleFileUpload = async () => {
		if (!selectedFile) {
			setUploadMessage('Choose file');
			return;
		}

		const formData = new FormData();
		formData.append('choosenFile', selectedFile); // take from input name 'choosenFile'

		try {
			const response = await fetch(`${API_URL}/upload`, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}

			const data = await response.json();
			setUploadMessage(`Uploaded: ${data.message}`);
		} catch (error) {
			console.error(error);
			setUploadMessage(`Error: ${error.message}`);
		}
	};

	return (
		<div style={{ padding: '2rem' }}>
			<h2>Upload file</h2>

			<input type='file' onChange={handleFileChange} />
			<button
				onClick={handleFileUpload}
				disabled={!selectedFile}
				style={{ marginLeft: '1rem' }}>
				Send
			</button>

			{uploadMessage && (
				<p
					style={{
						color: uploadMessage.startsWith('Error') ? 'red' : 'green',
						marginTop: '1rem',
					}}>
					{uploadMessage}
				</p>
			)}
		</div>
	);
}
