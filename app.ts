import express from "express";
import dotenv from "dotenv";
import { URLSearchParams } from "url";
import queryString from "querystring";
import request from "request";
import session from "express-session";

dotenv.config();
const app = express();

app.use(
	session({
		secret: "your-secret-key",
		resave: false,
		saveUninitialized: true,
	})
);

const port = process.env.PORT;
const spotify_client_id = process.env.SPOTIFY_CLIENT_ID || "";
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET || "";
const redirect_uri = process.env.REDIRECT_URI || "";
const scope = process.env.SCOPE || "";
const frontend_uri = process.env.FRONTEND_URI || "";

app.get("/", (req, res) => {
	res.json({ data: "this test is working" });
});

app.get("/auth/login", (req, res) => {
	console.log("INSIDE AUTH/LOGIN");
	console.log(
		"ALL THE ENV VARIABLES",
		spotify_client_id,
		spotify_client_secret,
		redirect_uri,
		scope,
		frontend_uri
	);
	const state = Math.random().toString(36).substring(7);
	req.session.state = state;

	var auth_query_parameters = new URLSearchParams({
		response_type: "code",
		state: state,
		client_id: spotify_client_id,
		scope: scope,
		redirect_uri: redirect_uri,
		show_dialog: "true",
	});

	res.redirect(
		"https://accounts.spotify.com/authorize/?" + auth_query_parameters
	);
});

app.get("/auth/callback", (req, res) => {
	console.log("req.session.state", req.session.state);
	const error = req.query.error;
	if (error) {
		res.redirect(
			frontend_uri + queryString.stringify({ error: "access_denied" })
		);
	}
	const code = req.query.code;
	const state = req.query.state;

	if (state !== req.session.state) {
		res.redirect(
			frontend_uri + queryString.stringify({ error: "state_mismatch" })
		);
	} else {
		const authOptions = {
			url: "https://accounts.spotify.com/api/token",
			form: {
				code: code,
				redirect_uri: redirect_uri,
				grant_type: "authorization_code",
			},
			headers: {
				Authorization:
					"Basic " +
					Buffer.from(spotify_client_id + ":" + spotify_client_secret).toString(
						"base64"
					),
			},
			json: true,
		};

		request.post(authOptions, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				req.session.access_token = body.access_token;
				req.session.refresh_token = body.refresh_token;
				res.redirect(frontend_uri);
			}
		});
	}
});

app.listen(port, () => {
	console.log(`starting server on PORT ${port}`);
});

declare module "express-session" {
	interface SessionData {
		state: string;
		access_token: string;
		refresh_token: string;
		// Add any other properties you need in the session
	}
}
