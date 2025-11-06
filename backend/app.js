require('dotenv').config()
const express = require('express')
const session = require('express-session')
const { Issuer, generators } = require('openid-client')
const cors = require('cors')
const path = require('path')

const app = express()

const SESSION_SECRET = process.env.SESSION_SECRET
const FRONTEND_URL = process.env.FRONTEND_URL
const REDIRECT_URI = process.env.REDIRECT_URI
const USER_POOL_DOMAIN = process.env.USER_POOL_DOMAIN
const CLIENT_ID = process.env.CLIENT_ID
const ISSUER_URL = process.env.ISSUER_URL


app.use(express.json()) // parsing reqs to json

app.use(
	cors({
		origin: FRONTEND_URL,
		credentials: true,
	})
)

app.use(
	session({
		secret: SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			// secure: true, 
			httpOnly: true,
		},
	})
)

// S3 configuration

const s3Client = new S3Client({
	region: AWS_REGION,
	credentials: {
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
	},
})



// --- Logika OpenID (Cognito) ---

let client
async function initializeClient() {
	// Odkrywamy konfigurację z domeny puli użytkowników
	const issuer = await Issuer.discover(ISSUER_URL)
	client = new issuer.Client({
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		redirect_uris: [REDIRECT_URI],
		response_types: ['code'],
		token_endpoint_auth_method: 'client_secret_post',
	})
}
initializeClient().catch(console.error)

const checkAuth = (req, res, next) => {
	req.isAuthenticated = !!req.session.userInfo
	next()
}

const requireAuth = (req, res, next) => {
	if (!req.session.userInfo) {
		return res.status(401).json({ message: 'Not authenticated' })
	}
	next()
}
// --- Endpoints API ---

// Endpoint to return session user info
app.get('/api/me', requireAuth, (req, res) => {
	res.json(req.session.userInfo)
})

// Endpoint to start login process
app.get('/login', (req, res) => {

	if (!client) {
		return res.status(500)
	}

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

// Logout
app.get('/logout', (req, res) => {
	const logoutUrl = `${USER_POOL_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(FRONTEND_URL)}`

	req.session.destroy(err => {
		res.clearCookie('connect.sid')
		res.redirect(logoutUrl)
	})
})

// Call back endpoint
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

		res.redirect(FRONTEND_URL) // redirect to react app
	} catch (err) {
		console.error('Callback error:', err)
		res.redirect(`${FRONTEND_URL}?error=auth_failed`) // redirect to error page
	}
})

// take files from public dir
app.use(express.static(path.join(__dirname, 'public')))

// response to not existing endpoint
app.get(/.*/, (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(3000, () => {
	console.log('Backend serwer API działa na http://localhost:3000')
	console.log(`Frontend powinien działać na ${FRONTEND_URL}`)
})
