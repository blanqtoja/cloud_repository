import { useState, useEffect } from 'react'
import axios from 'axios'
// Możesz usunąć pliki App.css i index.css, jeśli chcesz czysty start

// Ustaw stały adres URL Twojego backendu
const API_URL = 'http://localhost:3000'

// Ważne: Konfiguruj axios, aby ZAWSZE wysyłał ciasteczka (dzięki temu działa sesja)
axios.defaults.withCredentials = true

function App() {
	const [userInfo, setUserInfo] = useState(null)
	const [isLoading, setIsLoading] = useState(true) // Zaczynamy od ładowania

	// Przy pierwszym ładowaniu komponentu, sprawdź sesję na backendzie
	useEffect(() => {
		const checkSession = async () => {
			try {
                // Odpytaj nasz nowy endpoint /api/me
				const response = await axios.get(`${API_URL}/api/me`)
				setUserInfo(response.data) // Jeśli się uda, mamy dane użytkownika
			} catch (error) {
				if (error.response && error.response.status === 401) {
					setUserInfo(null) // 401 = Niezalogowany
				} else {
					// Inny błąd serwera
					console.error('Błąd przy sprawdzaniu sesji:', error)
				}
			}
			setIsLoading(false) // Zakończ ładowanie
		}

		checkSession()
	}, []) // Pusty array [] = uruchom ten efekt tylko raz, przy starcie

    // Pokaż ekran ładowania, dopóki nie mamy odpowiedzi z /api/me
	if (isLoading) {
		return <div>Trwa ładowanie...</div>
	}

	return (
		<div className="App">
			<h1>Demo Logowania (React + Express + Cognito)</h1>

			{userInfo ? (
				// --- Widok po zalogowaniu ---
				<div>
					<h2>Witaj, {userInfo.username || userInfo.email}</h2>
					<p>Oto Twoje dane (z /api/me):</p>
					<pre>{JSON.stringify(userInfo, null, 2)}</pre>

					{/* Link do endpointu /logout na naszym backendzie */}
					<a href={`${API_URL}/logout`}>Wyloguj</a>
				</div>
			) : (
				// --- Widok przed zalogowaniem ---
				<div>
					<p>Proszę, zaloguj się, aby kontynuować.</p>

					{/* Link do endpointu /login na naszym backendzie */}
					<a href={`${API_URL}/login`}>Zaloguj przez Cognito</a>
				</div>
			)}
		</div>
	)
}

export default App