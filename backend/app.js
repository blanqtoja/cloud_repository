require('dotenv').config()
const express = require('express')
const session = require('express-session')
const { Issuer, generators } = require('openid-client')
const cors = require('cors')
const path = require('path')

const app = express()

// Odczytujemy konfigurację z .env
const FRONTEND_URL = process.env.FRONTEND_URL
const REDIRECT_URI = process.env.REDIRECT_URI
const USER_POOL_DOMAIN = process.env.USER_POOL_DOMAIN
const CLIENT_ID = process.env.CLIENT_ID
const ISSUER_URL = process.env.ISSUER_URL

// --- Konfiguracja ---

app.use(
	cors({
		origin: FRONTEND_URL, // Zezwalaj na żądania tylko z tej domeny
		credentials: true, // Zezwalaj na przesyłanie ciasteczek
	})
)

app.use(
	session({
		secret: 'super-tajny-sekret-zmien-mnie', // Lepiej wczytać z .env
		resave: false,
		saveUninitialized: false,
		cookie: {
			// secure: true, // Włącz na produkcji (gdy masz HTTPS)
			httpOnly: true,
		},
	})
)

// --- Logika OpenID (Cognito) ---

let client
async function initializeClient() {
	// Odkrywamy konfigurację z domeny puli użytkowników
	const issuer = await Issuer.discover(ISSUER_URL)
	client = new issuer.Client({
		client_id: CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
		redirect_uris: [REDIRECT_URI],
		response_types: ['code'],
	})
}
initializeClient().catch(console.error)

const checkAuth = (req, res, next) => {
	req.isAuthenticated = !!req.session.userInfo
	next()
}

// --- Endpoints (Punkty końcowe) API ---

// 1. Endpoint, który React sprawdzi, czy jesteśmy zalogowani
app.get('/api/me', checkAuth, (req, res) => {
	if (req.isAuthenticated) {
		res.json(req.session.userInfo)
	} else {
		res.status(401).json({ message: 'Not authenticated' })
	}
})

// 2. Endpoint rozpoczynający proces logowania
app.get('/login', (req, res) => {
	const nonce = generators.nonce()
	const state = generators.state()

	req.session.nonce = nonce
	req.session.state = state

	const authUrl = client.authorizationUrl({
		scope: 'phone openid email',
		state: state,
		nonce: nonce,
	})
	res.redirect(authUrl)
})

// 3. Endpoint wylogowania
app.get('/logout', (req, res) => {
	const logoutUrl = `${USER_POOL_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(FRONTEND_URL)}`

	req.session.destroy(err => {
		res.clearCookie('connect.sid') // Nazwa domyślnego ciasteczka sesji
		res.redirect(logoutUrl)
	})
})

// 4. Endpoint Callback (tutaj wraca Cognito po logowaniu)
// Używamy `new URL(...).pathname`, aby dostać samą ścieżkę (np. '/')
const CALLBACK_PATH = new URL(REDIRECT_URI).pathname

app.get(CALLBACK_PATH, async (req, res) => {
	try {
		const params = client.callbackParams(req)
		const tokenSet = await client.callback(REDIRECT_URI, params, {
			nonce: req.session.nonce,
			state: req.session.state,
		})

		const userInfo = await client.userinfo(tokenSet.access_token)
		req.session.userInfo = userInfo

		// Sukces! Przekieruj z powrotem do aplikacji React
		res.redirect(FRONTEND_URL)
	} catch (err) {
		console.error('Callback error:', err)
		res.redirect(`${FRONTEND_URL}?error=auth_failed`)
	}
})

// --- Serwowanie statyczne (na produkcję) ---
// Ten kod serwuje zbudowaną aplikację React

app.use(express.static(path.join(__dirname, 'public')))

app.get(/.*/, (req, res) => {
	// Na wszystkie inne żądania odpowiadaj plikiem index.html Reacta
	res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// --- Uruchomienie serwera ---

app.listen(3000, () => {
	console.log('Backend serwer API działa na http://localhost:3000')
	console.log(`Frontend powinien działać na ${FRONTEND_URL}`)
})
