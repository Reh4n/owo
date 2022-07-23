const { makeid, formatBytes, clockString, pickRandom, sleep, getBuffer, fetchJson, shortUrl, getFile, getTime, processTime, ytv, yta, ytDownload, tiktokDownloader, downloader, doujindesuDl, toPDF, anonfilesDl, uploadFromPath, reqBuffer } = require('./function.js')
const { toAudio, toPTT, toVideo, convertSticker, mp4ToWebp } = require('./converter.js')
const { promisify, format } = require('util')
const os = require('os')
const cp = require('child_process')
const express = require('express')
const logger = require('morgan')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const cheerio = require('cheerio')
const request = require('request')
const topdf = require('image-to-pdf')
const Nhentaikyy = require('nhentai-ikyy')
const nhentai = new Nhentaikyy()
const _gis = require('g-i-s')
const googleIt = require('google-it')
const yts = require('yetesearch')
const removebg = require('removebg-id')
const sagiri = require('sagiri')
const hx = require('hxz-api')
const xa = require('xfarr-api')
const deepai = require('deepai')
deepai.setApiKey('31c3da72-e27e-474c-b2f4-a1b685722611')
const ameClient = require('amethyste-api')
const ameApi = new ameClient('1f486b04b157f12adf0b1fe0bd83c92a28ce768683871d2a390e25614150d0c8fa404fd01b82a5ebf5b82cbfa22e365e611c8501225a93d5d1e87f9f420eb91b')
const moment = require('moment-timezone')

const gis = promisify(_gis)
const sauce = sagiri('96a418eb1f0d7581fad16d30e0dbf1dbbdf4d3bd')
const hmtai = 'https://hmtai.herokuapp.com/v2'
const isUrl = url => url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/, 'gi'))
const app = express()
const port = process.env.PORT || 8000 || 3000
// const WAConnection = simple.WAConnection(_WAConnection)
let prefix = ':'

app.set('json spaces', 2)
app.use(cors())
app.use(logger('dev'))
app.use(express.json())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(function(err, req, res, next) {
	console.error(err.stack)
	res.status(500).send('Something broke!')
})

const storage = multer.diskStorage({ destination: 'public/file', filename: (req, file, cb) => cb(null, makeid(10) + path.extname(file.originalname)) })
const upload = multer({ storage, limits: { fileSize: 10000000 }}) // 10 MB

app.get(['/', '/api'], (req, res) => {
	res.status(200).json({
		status: true,
		runtime: clockString(process.uptime()),
		base_url: "https://rest-api.akkun3704.repl.co/api",
		result: {
			"Play": "/play?query=flos",
			"Ytplay": "/ytplay?query=https://youtube.com/watch?v=4muYzftomAE",
			"Ytmp4": "/ytmp4?url=https://youtube.com/watch?v=4muYzftomAE&quality=360p",
			"Ytmp3": "/ytmp3?url=https://youtube.com/watch?v=4muYzftomAE&quality=128",
			"Nhentai": "/nhentai?code=212121",
			"Nhentai_pdf": "/nhpdf?code=212121",
			"Nhentai_search": "/nhsearch?query=tawawa",
			"Nhentai_latest": "/nhlatest",
			"Nhentai_random": "/nhrandom",
			"Removebg": "/removebg?url=https://telegra.ph/file/d15e6c645e86d1c82884b.png",
			"Enhance": "/enhance?url=https://telegra.ph/file/d15e6c645e86d1c82884b.png",
			"Image_search": "/image?query=anime",
			"Pinterest_search": "/pinterest?query=anime"
		}
	})
})

// Mengeval
app.get('/eval', async (req, res) => {
	let query = req.query.query || req.query.q
	let evaled = `(async () => { ${query} })()`
	let text
	try {
		text = await eval(evaled)
	} catch (e) {
		text = e
	} finally {
		res.send(format(text))
	}
})
app.get(['/term', '/exec'], async (req, res) => {
	let query = req.query.query || req.query.q
	if (!query) return res.status(400).json({ message: "Input parameter query" })
	let exec = promisify(cp.exec).bind(cp)
	let o
	try {
		o = await exec(query)
	} catch (e) {
		o = e
	} finally {
		let { stdout, stderr } = o
		if (stdout) res.send(stdout)
		if (stderr) res.send(stderr)
	}
})

// UploadFile
app.post('/upload', upload.single('file'), (req, res) => {
	if (!req.file.path) return res.status(400).json({ message: "No file uploaded" })
	res.status(200).json({
		status: true,
		result: {
			originalname: req.file.originalname,
			encoding: req.file.encoding,
			mimetype: req.file.mimetype,
			size: formatBytes(req.file.size),
			url: "https://" + req.hostname + "/file/" + req.file.filename
		}
	})
})

// Nhentai

app.get('/api/nhlatest', (req, res) => {
	nhentai.getHomepage(1).then(result => res.status(200).json({ status: true, result }))
})
app.get('/api/nhsearch', (req, res) => {
	let query = req.query.query || req.query.q
	if (!query) return res.status(400).json({ message: "Input parameter query" })
	nhentai.search(query).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/nhentai', (req, res) => {
	let code = req.query.code
	if (!code || isNaN(code)) return res.status(400).json({ message: "Input parameter code" })
	nhentai.getDoujin(code).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get(['/api/nhpdf', '/api/nhentaipdf'], (req, res) => {
	let code = req.query.code
	if (!code || isNaN(code)) return res.status(400).json({ message: "Input parameter code" })
	nhentai.getDoujin(code).then(async ({ title, thumbnails, pages }) => {
		console.log('Downloading', pages.length, 'pages...')
		title = title
		pages = pages.map(v => 'https://external-content.duckduckgo.com/iu/?u=' + v)
		let buffer = await toPDF(pages)
		await fs.writeFileSync(process.cwd() + `/nhentai/${title}.pdf`, buffer)
		let data = await uploadFromPath(process.cwd() + `/nhentai/${title}.pdf`)
		console.log(data)
		let { url } = await anonfilesDl(data.url.full)
		res.status(200).json({ status: true, result: { filename: data.metadata.name, filesize: data.metadata.size.readable, cover: 'https://external-content.duckduckgo.com/iu/?u=' + thumbnails[0], url }})
		await sleep(3000)
		await fs.unlinkSync(process.cwd() + `/nhentai/${title}.pdf`)
	}).catch(err => res.status(400).json({ error: String(err) }))
})

app.get('/api/doujindesu', (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	doujindesuDl(url).then(async ({ title, image }) => {
		console.log('Downloading', image.length, 'pages...')
		let images = image.map(v => v)
		let buffer = await toPDF(images)
		await fs.writeFileSync(process.cwd() + `/nhentai/${title}.pdf`, buffer)
		let data = await uploadFromPath(process.cwd() + `/nhentai/${title}.pdf`)
		console.log(data)
		let { url } = await anonfilesDl(data.url.full)
		res.status(200).json({ status: true, result: { filename: data.metadata.name, filesize: data.metadata.size.readable, cover: image[1], url }})
		await sleep(3000)
		await fs.unlinkSync(process.cwd() + `/nhentai/${title}.pdf`)
	}).catch(err => res.status(400).json({ error: format(err) }))
})

// Search
app.get('/api/google', (req, res) => {
	let query = req.query.query || req.query.q
	if (!query) return res.status(400).json({ message: "Input parameter query" })
	googleIt({ query: query, disableConsole: true }).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/image', (req, res) => {
	let query = req.query.query || req.query.q
	if (!query) return res.status(400).json({ message: "Input parameter query" })
	gis(query).then(result => {
		let { url, width, height } = pickRandom(result)
		res.status(200).json({ status: true, result: { url, width, height }})
	}).catch(err => res.status(400).json({ error: String(err) }))
})
app.get(['/api/pin', '/api/pinterest'], (req, res) => {
	let query = req.query.query || req.query.q
	if (!query) return res.status(400).json({ message: "Input parameter query" })
	gis(query).then(async result => {
		let data = result.filter(v => v.url.includes('pinimg'))
		if (data.length < 1) return res.status(200).json({ status: true, result: { url: pickRandom(await hx.pinterest(query)) }})
		let { url, width, height } = pickRandom(data)
		res.status(200).json({ status: true, result: { url, width, height }})
	}).catch(err => res.status(400).json({ error: String(err) }))
})
app.get(['/api/ytsearch', '/api/yts'], async (req, res) => {
	let query = req.query.url
	if (!query) return res.status(400).json({ message: "Input parameter query" })
	yts(query).then(v => res.status(200).json({ status: true, result: v.videos })).catch(err => res.status(400).json({ error: String(err) }))
})

// Ya begitulah
app.get('/api/removebg', (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	removebg.FromUrl(url, '2mZbr62TiNKYw3rFPPtb4BYn').then(async () => res.status(200).sendFile(process.cwd() + '/hasil-url.png')).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/enhance', (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	getBuffer(url).then(async data => {
		fs.writeFileSync(process.cwd() + '/enhance.jpg', data)
		let { output_url: url } = await deepai.callStandardApi('waifu2x', { image: fs.readFileSync(process.cwd() + '/enhance.jpg') })
		res.type('png')
		res.status(200).send(await getBuffer(url))
	}).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/sauce', (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	getBuffer(url).then(async data => {
		fs.writeFileSync(process.cwd() + '/sauce.jpg', data)
		let result = await sauce(process.cwd() + '/sauce.jpg')
		res.status(200).json({ status: true, result })
	}).catch(err => res.status(400).json({ error: String(err) }))
})

// Random image
app.get('/api/vtuber', (req, res) => {
	axios.get(encodeURI('https://raw.githubusercontent.com/null-good/null_bot/master/util/vtuber18r區域.json')).then(({ data }) => {
		let { url: result } = (pickRandom(data)).attachments[0]
		res.status(200).json({ status: true, result })
	}).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/siesta', (req, res) => {
	fetchJson('https://siesta-api.bhhoang.repl.co/').then(v => res.status(200).json({ status: true, result: v.success })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/wallpaper', (req, res) => {
	fetchJson(hmtai + '/wallpaper').then(v => res.status(200).json({ status: true, result: v.url })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/neko', (req, res) => {
	fetchJson(hmtai + '/neko').then(v => res.status(200).json({ status: true, result: v.url })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/hentai', (req, res) => {
	fetchJson(hmtai + '/hentai').then(v => res.status(200).json({ status: true, result: v.url })).catch(err => res.status(400).json({ error: String(err) }))
})

// Downloader
app.get('/api/ytplay', (req, res) => {
	let query = req.query.query || req.query.url || req.query.q
	if (!query) return res.status(400).json({ message: "Input parameter query/url" })
	ytDownload(query).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/play', async (req, res) => {
	let query = req.query.query || req.query.q
	if (!query) return res.status(400).json({ message: "Input parameter query" })
	let { videos } = await yts(query)
	if (videos.length < 1) return res.status(400).json({ message: "Music not found" })
	yta(videos[0].url).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get(['/api/ytmp4', '/api/ytv'], (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	ytv(url, req.query.quality).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get(['/api/ytmp3', '/api/yta'], (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	yta(url, req.query.quality).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})
app.get('/api/tiktok', (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	tiktokDownloader(url).then(result => res.status(200).json({ status: true, result })).catch(err => res.status(400).json({ error: String(err) }))
})

// Effect
app.get(['/api/circle', '/api/distort', '/api/fire', '/api/glitch', '/api/invert', '/api/jail', '/api/magik', '/api/missionpassed', '/api/moustache', '/api/rip', '/api/scary', '/api/thanos', '/api/tobecontinued', '/api/wanted', '/api/wasted'], (req, res) => {
	let url = req.query.url
	if (!(url || isUrl(url))) return res.status(400).json({ message: "Input parameter url" })
	let param = req._parsedUrl.pathname.slice(5)
	ameApi.generate(param, { url: url }).then(img => {
		res.type('png')
		res.status(200).send(img)
	}).catch(err => res.status(400).json({ error: String(err) }))
})

// Handling 404
app.use(function(req, res, next) {
	res.status(404).json({ message: "Page not found" })
})

app.listen(port, () => {
	console.log(`App listening at http://localhost:${port}`)
	console.log(`Folder Size: ${formatBytes(fs.statSync('./public/file').size)}`)
})