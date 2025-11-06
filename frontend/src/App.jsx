import { useState, useEffect } from 'react'
import axios from 'axios'
import UploadFile from './UploadFile'

const API_URL = 'http://localhost:3000'

axios.defaults.withCredentials = true

function App() {

	// states
	const [userInfo, setUserInfo] = useState(null)
	const [isLoading, setIsLoading] = useState(true) 

	// files states
	const [selectedFile, setSelectedFile] = useState(null)
	const [uploadMessage, setUploadMessage] = useState('')

	// Effects
	useEffect(() => {
		// firtly check session on /api/me
		const checkSession = async () => {
			try {
				const response = await axios.get(`${API_URL}/api/me`)
				setUserInfo(response.data) // set info about user from response
			} catch (error) {
				if (error.response && error.response.status === 401) {
					setUserInfo(null) // user is not logged
				} else {
					console.error('error: ', error)
				}
			}
			setIsLoading(false) // finish loading
		}

		checkSession()
	}, []) 

	// Rndering

	// loading screen
    if (isLoading) {
		return (
			<div style={{ padding: '2rem' }}>
				<h1>Loading...</h1>
			</div>
		)
	}

	return (
		<div className='App' style={{ padding: '2rem', fontFamily: 'sans-serif' }}>

			{userInfo ? (
				<div>
					<h2>Hi, {userInfo.username || userInfo.email}</h2>
					<p>user data:</p>
					<pre
						style={{
							background: '#f4f4f4',
							padding: '1rem',
							borderRadius: '8px',
						}}>
						{JSON.stringify(userInfo, null, 2)}
					</pre>

					<a href={`${API_URL}/logout`} style={{ color: 'blue', marginRight: '1rem' }}>
						Log out
					</a>

					<hr style={{ margin: '2rem 0' }} />
					<UploadFile />
				</div>
			) : (
				<div>
					<p>Hi, log in to continue</p>

					<a href={`${API_URL}/login`} style={{ color: 'blue' }}>
						Log in
					</a>
				</div>
			)}
		</div>

	)
}

export default App