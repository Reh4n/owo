const fs = require('fs')
const hx = require('hxz-api')
const axios = require('axios')
const pdfkit = require('pdfkit')
const yts = require('yetesearch')
const ytdl = require('yutub-core')
const cheerio = require('cheerio')
const request = require('request')
const FileType = require('file-type')
const FormData = require('form-data')
const tiktokscrape = require('tiktok-scraper')
const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')

function makeid(length) {
	let result = ''
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const charactersLength = characters.length
	for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * charactersLength))
	return result
}

function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = [' Bytes', ' KB', ' MB', ' GB', ' TB', ' PB', ' EB', ' ZB', ' YB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i] || null
}

function clockString(ms) {
	let h = isNaN(ms) ? '--' : Math.floor(ms % (3600 * 24) / 3600)
	let m = isNaN(ms) ? '--' : Math.floor(ms % 3600 / 60)
	let s = isNaN(ms) ? '--' : Math.floor(ms % 60)
	return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function pickRandom(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function getBuffer(url) {
	return new Promise(resolve => axios.get(url, { responseType: 'arraybuffer' }).then(v => resolve(v.data)))
}

function fetchJson(url) {
	return new Promise(resolve => axios.get(url).then(v => resolve(v.data)))
}

function reqBuffer(url) {
	return new Promise((resolve, reject) => {
		request({ url: url, encoding: null }, function(err, body) {
			if (err) reject(String(err))
			else resolve(body.body)
		})
	})
}

function shortUrl(url) {
	return new Promise(resolve => axios.get(`http://hadi-api.herokuapp.com/api/shorturl?url=${url}`).then(v => resolve(v.data.result)))
}

function getFile(path) {
	return new Promise(async (resolve, reject) => {
		let res
		let data = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? (res = await axios.get(path, { responseType: 'arraybuffer' })).data : fs.existsSync(path) ? fs.readFileSync(path) : typeof path === 'string' ? path : Buffer.alloc(0)
		if (!Buffer.isBuffer(data)) reject('Result is not a buffer')
		let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
		resolve({ res, ...type, data })
	})
}

function getTime(format, date) {
	if (date) return moment(date).locale('id').format(format)
	else return moment.tz('Asia/Jakarta').locale('id').format(format)
}

function processTime(timestamp, now) {
	return moment.duration(now - moment(timestamp * 1000)).asSeconds()
}

function ytv(url, quality = '360p') {
	return new Promise((resolve, reject) => {
		ytdl.getInfo(url).then(async ({ formats, videoDetails }) => {
			let item = formats.filter(v => /mp4/.test(v.container) && v.hasAudio == true && v.qualityLabel == quality)
			if (typeof item[0] == undefined) item = formats.filter(v => /mp4/.test(v.container) && v.hasAudio == true && /(360p)/.test(v.qualityLabel))
			console.log(item)
			let { title, description, lengthSeconds, viewCount: views, ownerChannelName: channel, uploadDate, likes, dislikes, thumbnails } = videoDetails
			// let thumb = await shortUrl(thumbnails[0].url)
			let thumb = thumbnails[0].url
			let duration = clockString(lengthSeconds)
			let { url, contentLength, qualityLabel } = item[0]
			let size = await formatBytes(contentLength) || null
			// url = await shortUrl(url)
			resolve({ title, url, size, quality: qualityLabel, thumb, description, duration, views, likes, dislikes, channel, uploadDate })
		}).catch(reject)
	})
}

function yta(url, bitrate = '128') {
	return new Promise((resolve, reject) => {
		ytdl.getInfo(url).then(async ({ formats, videoDetails }) => {
			let item = formats.filter(v => /(webm|mp4)/.test(v.container) && v.hasAudio == true && v.audioBitrate == bitrate)
			console.log(item)
			let { title, description, lengthSeconds, viewCount: views, ownerChannelName: channel, uploadDate, likes, dislikes, thumbnails } = videoDetails
			// let thumb = await shortUrl(thumbnails[0].url)
			let thumb = thumbnails[0].url
			let duration = clockString(lengthSeconds)
			let { url, contentLength, audioBitrate } = item[0]
			let size = await formatBytes(contentLength) || null
			// url = await shortUrl(url)
			resolve({ title, url, size, bitrate: audioBitrate + 'kbps', thumb, description, duration, views, likes, dislikes, channel, uploadDate })
		}).catch(reject)
	})
}

function ytDownload(query) {
	return new Promise(async (resolve, reject) => {
		let { videos } = await yts(query)
		ytdl.getInfo(typeof videos[0] == undefined ? query : videos[0].url).then(async ({ formats, videoDetails }) => {
			let audio = [], video = []
			for (let i = 0; i < formats.length; i++) {
				if (/mp4/.test(formats[i].container) && formats[i].hasVideo == true && formats[i].hasAudio == true) video.push({ quality: formats[i].qualityLabel, size: await formatBytes(formats[i].contentLength), url: formats[i].url })
				else if (/(webm|mp4)/.test(formats[i].container) && formats[i].hasAudio == true) audio.push({ bitrate: formats[i].audioBitrate, size: await formatBytes(formats[i].contentLength), url: formats[i].url })
			}
			let { title, description, lengthSeconds, viewCount: views, ownerChannelName: channel, uploadDate, likes, dislikes, thumbnails } = videoDetails
			// let thumb = await shortUrl(thumbnails[0].url)
			let thumb = thumbnails[0].url
			let duration = clockString(lengthSeconds)
			resolve({ title, thumb, description, duration, views, likes, dislikes, channel, audio, video })
		}).catch(reject)
	})
}

function tiktokDownloader(url) {
	return new Promise((resolve, reject) => {
		tiktokscrape.getVideoMeta(url).then(async res => {
			console.log(JSON.stringify(res))
			let { id, text: desc, imageUrl: thumb, diggCount: likes, shareCount: share, commentCount: comments, playCount: views, musicMeta } = res.collector[0]
			let { nowm, wm, audio } = await hx.ttdownloader(url)
			// thumb = await shortUrl(imageUrl), nowm = await shortUrl(nowm), wm = await shortUrl(wm), audio = await shortUrl(audio)
			resolve({ id, desc, thumb, likes, share, comments, views, music_name: musicMeta.musicName, nowm, wm, audio })
		}).catch(reject)
	})
}

function downloader(url) {
	return new Promise((resolve, reject) => {
		axios.get('https://aiovideodl.ml/', { headers: {
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			'cookie': 'PHPSESSID=3893d5f173e91261118a1d8b2dc985c3; _ga=GA1.2.792478743.1635388171;'
		}}).then(({ data }) => {
			let $ = cheerio.load(data)
			let token = $('#token').attr('value')
			let options = { method: 'POST', url: 'https://aiovideodl.ml/wp-json/aio-dl/video-data/', headers: {
					'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					'cookie': 'PHPSESSID=3893d5f173e91261118a1d8b2dc985c3; _ga=GA1.2.792478743.1635388171;'
				}, formData: { url: url, token: token }
			}
			request(options, function(err, body) {
				if (err) reject(String(err))
				resolve(JSON.parse(body.body))
			})
		})
	})
}

function doujindesuDl(url) {
	return new Promise((resolve, reject) => {
		axios.get(url, { headers: {
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			'cookie': 'PHPSESSID=3893d5f173e91261118a1d8b2dc985c3; _ga=GA1.2.792478743.1635388171;'
		}}).then(({ data }) => {
			let $ = cheerio.load(data)
			let title = $('div.lm').find('h1').text().replace('.', '').trim()
			let link_dl = $('div.chright').find('a').attr('href')
			let image = []
			$('div.reader-area > img').each(function(a, b) {
				image.push($(b).attr('src'))
			})
			resolve({ title, link_dl, image })
		}).catch(reject)
	})
}

function toPDF(images) {
	return new Promise(async (resolve, reject) => {
		if (!Array.isArray(images)) images = [images]
		let buffs = []
		let doc = new pdfkit({ margin: 0, size: [ 595.28, 841.89 ] })
		for (let img of images) {
			let data = await getBuffer(img)
			doc.image(data, 0, 0, { fit: [ 595.28, 841.89 ], align: 'center', valign: 'center' })
			doc.addPage()
		}
		doc.on('data', (chunk) => buffs.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(buffs)))
		doc.on('error', (err) => reject(err))
		doc.end()
	})
}

function anonfilesDl(url) {
	return new Promise((resolve, reject) => {
		axios.get(url).then(({ data }) => {
			let $ = cheerio.load(data)
			let title = $('title').text().replace('- AnonFiles', '').trim()
			let size = $('#download-url').text().split('\n')[1].replace(/ /g, '').replace(/\(|\)/g, '')
			let url = encodeURI($('#download-url').attr('href'))
			resolve({ title, size, url })
		}).catch(reject)
	})
}

// function uploadFromPath(path) {
	// return new Promise((resolve, reject) => {
		// let bodyForm = new FormData()
		// bodyForm.append('file', fs.createReadStream(path))
		// axios('https://api.anonfiles.com/upload', { method: 'POST', data: bodyForm, maxContentLength: Infinity, maxBodyLength: Infinity, headers: {
			// 'accept': '*/*',
			// 'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
			// 'content-type': `multipart/form-data; boundary=${bodyForm._boundary}`
		// }}).then(({ data }) => {
			// resolve(data.data.file)
		// }).catch(reject)
	// })
// }

function uploadFromPath(path) {
	return new Promise((resolve, reject) => {
		request('https://api.anonfiles.com/upload', { method: 'POST', formData: { file: fs.createReadStream(path) }}, function(err, body) {
			if (err) reject(err)
			else resolve(JSON.parse(body.body).data.file)
		})
	})
}

module.exports = { makeid, formatBytes, clockString, pickRandom, sleep, getBuffer, fetchJson, shortUrl, getFile, getTime, processTime, ytv, yta, ytDownload, tiktokDownloader, downloader, doujindesuDl, toPDF, anonfilesDl, uploadFromPath, reqBuffer }