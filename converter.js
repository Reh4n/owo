const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
const filetype = require('file-type')
// const fetch = require('node-fetch')
const { JSDOM } = require('jsdom')
const FormData = require('form-data')
const { exec, spawn } = require('child_process')

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
	return new Promise(async (resolve, reject) => {
		try {
			let tmp = path.join(__dirname, '/public', + new Date + '.' + ext)
			let out = tmp + '.' + ext2
			await fs.promises.writeFile(tmp, buffer)
			spawn('ffmpeg', ['-y', '-i', tmp, ...args, out])
				.on('error', reject)
				.on('close', async (code) => {
					try {
						await fs.promises.unlink(tmp)
						if (code !== 0) return reject(code)
						resolve(await fs.promises.readFile(out))
						await fs.promises.unlink(out)
					} catch (e) {
						reject(e)
					}
				})
		} catch (e) {
			reject(e)
		}
	})
}

function toAudio(buffer, ext) {
	return ffmpeg(buffer, [
		'-vn',
		'-ac', '2',
		'-b:a', '128k',
		'-ar', '44100',
		'-f', 'mp3'
	], ext, 'mp3')
}

function toPTT(buffer, ext) {
	return ffmpeg(buffer, [
		'-vn',
		'-c:a', 'libopus',
		'-b:a', '128k',
		'-vbr', 'on',
		'-compression_level', '10'
	], ext, 'opus')
}

function toVideo(buffer, ext) {
	return ffmpeg(buffer, [
		'-c:v', 'libx264',
		'-c:a', 'aac',
		'-ab', '128k',
		'-ar', '44100',
		'-crf', '32',
		'-preset', 'slow'
	], ext, 'mp4')
}

function convertSticker(file, stickerMetadata) {
	return new Promise(async (resolve, reject) => {
		if (stickerMetadata) {
			if (!stickerMetadata.author) stickerMetadata.author = "‎"
			if (!stickerMetadata.pack) stickerMetadata.pack = "‎"
			stickerMetadata.keepScale = (stickerMetadata.keepScale !== undefined) ? stickerMetadata.keepScale : false
			stickerMetadata.circle = (stickerMetadata.circle !== undefined) ? stickerMetadata.circle : false
		} else if (!stickerMetadata) {
			stickerMetadata = {
				author: "‎",
				pack: "‎",
				keepScale: false,
				circle: false,
				removebg: "HQ"
			}
		}
		let getBase64 = Buffer.isBuffer(file) ? file.toString("base64") : (typeof file === "string" && fs.existsSync(file)) ? fs.readFileSync(file).toString("base64") : null
		let FileType = (typeof file === "string" && fs.existsSync(file)) ? (await filetype.fromFile(file)).mime : Buffer.isBuffer(file) ? (await filetype.fromBuffer(file)).mime : undefined
		if (!FileType) return reject(new Error("File Type Undefined"))
		if (!getBase64) return reject(new Error("File Base64 Undefined"))
		const Format = {
			image: `data:${FileType};base64,${getBase64}`,
			stickerMetadata: {
				...stickerMetadata
			},
			sessionInfo: {
				WA_VERSION: "2.2106.5",
				PAGE_UA: "WhatsApp/2.2037.6 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
				WA_AUTOMATE_VERSION: "3.6.10 UPDATE AVAILABLE: 3.6.11",
				BROWSER_VERSION: "HeadlessChrome/88.0.4324.190",
				OS: "Windows Server 2016",
				START_TS: 1614310326309,
				NUM: "6247",
				LAUNCH_TIME_MS: 7934,
				PHONE_VERSION: "2.20.205.16"
			},
			config: {
				sessionId: "session",
				headless: true,
				qrTimeout: 20,
				authTimeout: 0,
				cacheEnabled: false,
				useChrome: true,
				killProcessOnBrowserClose: true,
				throwErrorOnTosBlock: false,
				chromiumArgs: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--aggressive-cache-discard",
					"--disable-cache",
					"--disable-application-cache",
					"--disable-offline-load-stale-cache",
					"--disk-cache-size=0"
				],
				executablePath: "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
				skipBrokenMethodsCheck: true,
				stickerServerEndpoint: true
			}
		}
		await axios({
			url: "https://sticker-api-tpe3wet7da-uc.a.run.app/prepareWebp",
			method: "POST",
			headers: {
				Accept: "application/json, text/plain, /",
				"Content-Type": "application/json;charset=utf-8",
				"User-Agent": "axios/0.21.1",
				"Content-Length": Infinity
			},
			data: JSON.stringify(Format)
		}).then((data) => {
			return resolve(Buffer.from(data.data.webpBase64, "base64"))
		}).catch((err) => reject(err))
	})
}

function mp4ToWebp(file, stickerMetadata) {
	return new Promise(async (resolve, reject) => {
		if (stickerMetadata) {
			if (!stickerMetadata.author) stickerMetadata.author = "‎"
			if (!stickerMetadata.pack) stickerMetadata.pack = "‎"
		} else if (!stickerMetadata) {
			stickerMetadata = {
				author: "‎",
				pack: "‎"
			}
		}
		let getBase64 = Buffer.isBuffer(file) ? file.toString("base64") : (typeof file === "string" && fs.existsSync(file)) ? fs.readFileSync(file).toString("base64") : null
		let FileType = (typeof file === "string" && fs.existsSync(file)) ? (await filetype.fromFile(file)).mime : Buffer.isBuffer(file) ? (await filetype.fromBuffer(file)).mime : undefined
		if (!FileType) return reject(new Error("File Type Undefined"))
		if (!getBase64) return reject(new Error("File Base64 undefined"))
		const Format = {
			file: `data:${FileType};base64,${getBase64}`,
			processOptions: {
				crop: (stickerMetadata.crop !== undefined) ? stickerMetadata.crop : false,
				startTime: "00:00:00.0",
				endTime: "00:00:7.0",
				loop: 0
			},
			stickerMetadata: {
				...stickerMetadata
			},
			sessionInfo: {
				WA_VERSION: "2.2106.5",
				PAGE_UA: "WhatsApp/2.2037.6 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
				WA_AUTOMATE_VERSION: "3.6.10 UPDATE AVAILABLE: 3.6.11",
				BROWSER_VERSION: "HeadlessChrome/88.0.4324.190",
				OS: "Windows Server 2016",
				START_TS: 1614310326309,
				NUM: "6247",
				LAUNCH_TIME_MS: 7934,
				PHONE_VERSION: "2.20.205.16"
			},
			config: {
				sessionId: "session",
				headless: true,
				qrTimeout: 20,
				authTimeout: 0,
				cacheEnabled: false,
				useChrome: true,
				killProcessOnBrowserClose: true,
				throwErrorOnTosBlock: false,
				chromiumArgs: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--aggressive-cache-discard",
					"--disable-cache",
					"--disable-application-cache",
					"--disable-offline-load-stale-cache",
					"--disk-cache-size=0"
				],
				executablePath: "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
				skipBrokenMethodsCheck: true,
				stickerServerEndpoint: true
			 }
		}
		await axios({
			url: "https://sticker-api.openwa.dev/convertMp4BufferToWebpDataUrl",
			method: "POST",
			headers: {
				Accept: "application/json, text/plain, /",
				"Content-Type": "application/json;charset=utf-8",
				"User-Agent": "axios/0.21.1"
			},
			data: JSON.stringify(Format)
		}).then((data) => {
			return resolve(Buffer.from(data.data.split(";base64,")[1], "base64"))
		}).catch((err) => reject(err))
	})
}

function webp2mp4(source) {
	return new Promise((resolve, reject) => {
		let form = new FormData()
		let isUrl = typeof source === 'string' && /https?:\/\//.test(source)
		form.append('new-image-url', isUrl ? source : '')
		form.append('new-image', isUrl ? '' : source, 'image.webp')
		axios({
			method: 'post',
			url: 'https://s6.ezgif.com/webp-to-mp4',
			data: form,
			headers: {
				'Content-Type': `multipart/form-data; boundary=${form._boundary}`
			}
		}).then(({ data }) => {
			let bodyForm = new FormData()
			let $ = cheerio.load(data)
			let file = $('input[name="file"]').attr('value')
			let token = $('input[name="token"]').attr('value')
			let convert = $('input[name="file"]').attr('value')
			let gotdata = {
				file: file,
				token: token,
				convert: convert
			}
			bodyForm.append('file', gotdata.file)
			bodyForm.append('token', gotdata.token)
			bodyForm.append('convert', gotdata.convert)
			axios({
				method: 'post',
				url: 'https://ezgif.com/webp-to-mp4/' + gotdata.file,
				data: bodyForm,
				headers: {
					'Content-Type': `multipart/form-data; boundary=${bodyForm._boundary}`
				}
			}).then(({ data }) => {
				let $ = cheerio.load(data)
				resolve('https:' + $('div#output > p.outfile > video > source').attr('src'))
			}).catch(reject)
		})
	})
}

function webp2png(url) {
	return new Promise((resolve, reject) => {
		axios.get("https://ezgif.com/webp-to-png?url=" + url).then(({ data }) => {
			let $ = cheerio.load(data)
			let form = new FormData()
			let file = $('input[name="file"]').attr("value")
			let token = $('input[name="token"]').attr("value")
			let actionpost = "https://ezgif.com" + $('form[class="form"]').attr("action")
			form.append("file", file)
			form.append("token", token)
			form.append("convert-to-png", "Convert to PNG!")
			axios({
				method: "post",
				url: actionpost,
				data: form,
				headers: {
					"Content-Type": `multipart/form-data; boundary=${form._boundary}`
				}
			}).then(({ data }) => {
				let $ = cheerio.load(data)
				resolve("https:" + $('div[id="output"]').find("p").first().find("img").attr("src"))
			}).catch(reject)
		})
	})
}

module.exports = {
	toAudio,
	toPTT,
	toVideo,
	ffmpeg,
	convertSticker,
	mp4ToWebp,
	webp2mp4,
	webp2png
}