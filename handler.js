const cron = require('node-cron'),
    fs = require('fs')
module.exports = async (clips, m, plugins, store) => {
   try {
      require('./system/svcop')(m)
      const FakeLoc = {
      key: {
         fromMe: false,
         participant: `0@s.whatsapp.net`,
         ...(m.sender ? {
            remoteJid: 'status@broadcast'
         } : {})
      },
      message: {
         "imageMessage": {
            "mimetype": "image/jpeg",
            "caption": global.bot_name + " WhatsApp Bot",
            "jpegThumbnail": await Func.createThumb(await fs.readFileSync(`./media/image/kens.jpg`))
         }
      }
   }
      const isOwner = [clips.decodeJid(clips.user.id).split`@` [0], global.owner, ...global.db.setting.owners].map(v => v + '@s.whatsapp.net').includes(m.sender)
      const isPrem = (global.db.users.some(v => v.jid == m.sender) && global.db.users.find(v => v.jid == m.sender).premium) || isOwner
      const isAuth = (global.db.users.some(v => v.jid == m.sender) && global.db.users.find(v => v.jid == m.sender).authentication) || isOwner
      const groupMetadata = m.isGroup ? await clips.groupMetadata(m.chat) : {}
      const participants = m.isGroup ? groupMetadata.participants : [] || []
      const adminList = m.isGroup ? await clips.groupAdmin(m.chat) : [] || []
      const isAdmin = m.isGroup ? adminList.includes(m.sender) : false
      const isBotAdmin = m.isGroup ? adminList.includes((clips.user.id.split`:` [0]) + '@s.whatsapp.net') : false
      const blockList = typeof await (await clips.fetchBlocklist()) != 'undefined' ? await (await clips.fetchBlocklist()) : []
      const groupSet = global.db.groups.find(v => v.jid == m.chat)
      const chats = global.db.chats.find(v => v.jid == m.chat)
      const users = global.db.users.find(v => v.jid == m.sender)
      const setting = global.db.setting
      if (!users || !chats) return require('./system/svcop')(m)
      const body = typeof m.text == 'string' ? m.text : false
      if (setting.debug && !m.fromMe && isOwner) clips.reply(m.chat, Func.jsonFormat(m), m)
      if (m.isGroup && !isBotAdmin) {
      groupSet.localonly = false
      groupSet.antibot = false
      }
      if (!m.fromMe && m.isGroup && groupSet.antibot && m.isBot && isBotAdmin && (!isOwner || !isAdmin)) return m.reply(Func.texted('bold', `Tidak ada bot lain yang diizinkan di sini.`)).then(async () => await clips.groupParticipantsUpdate(m.chat, [m.sender], 'remove'))
       if (m.isGroup && groupSet.autoread) await clips.readMessages([m.key])
      if (!m.isGroup) await clips.readMessages([m.key])
      if (m.isGroup) groupSet.activity = new Date() * 1
      if (m.isGroup && !groupSet.stay && (new Date * 1) >= groupSet.expired && groupSet.expired != 0) {
         return clips.reply(m.chat, Func.texted('italic', 'Waktu sewa bot telah habis dan akan keluar dari grup ini, terima kasih.', null, {
            mentions: participants.map(v => v.id)
         })).then(async () => {
            groupSet.expired = 0
            await Func.delay(2000).then(() => clips.groupLeave(m.chat))
         })
      }
      if (users && (new Date * 1) >= users.expired && users.expired != 0) {
         return clips.reply(m.chat, Func.texted('italic', 'Your premium package has expired, thank you for buying and using our service.'), FakeLoc).then(async () => {
            users.premium = false
            users.expired = 0
            users.limit = global.limit
         })
      }
      if (users) {
         users.name = m.pushName
         users.lastseen = new Date() * 1
      }
      if (chats) {
         chats.lastseen = new Date() * 1
         chats.chat += 1
      }
      if (m.isGroup && !m.isBot && users && users.afk > -1) {
         clips.reply(m.chat, `You are back online after being offline for : ${Func.texted('bold', Func.toTime(new Date - users.afk))}\n\n➠ ${Func.texted('bold', 'Reason')}: ${users.afkReason ? users.afkReason : '-'}`, FakeLoc, { montions: users.afk })
         users.afk = -1
         users.afkReason = ''
         users.afkObj = {}
      }
      clips.ev.on('presence.update', update => {
         const {
            id,
            presences
         } = update
         if (id.endsWith('g.us')) {
            for (let jid in presences) {
               if (!presences[jid] || jid == clips.decodeJid(clips.user.id)) continue
               if ((presences[jid].lastKnownPresence === 'composing' || presences[jid].lastKnownPresence === 'recording') && global.db.users.find(v => v.jid == jid) && global.db.users.find(v => v.jid == jid).afk > -1) {
                  clips.reply(id, `System detects activity from @${jid.replace(/@.+/, '')} after being offline for : ${Func.texted('bold', Func.toTime(new Date - global.db.users.find(v => v.jid == jid).afk))}\n\n➠ ${Func.texted('bold', 'Reason')} : ${global.db.users.find(v => v.jid == jid).afkReason ? global.db.users.find(v => v.jid == jid).afkReason : '-'}`, global.db.users.find(v => v.jid == jid).afkObj)
                  global.db.users.find(v => v.jid == jid).afk = -1
                  global.db.users.find(v => v.jid == jid).afkReason = ''
                  global.db.users.find(v => v.jid == jid).afkObj = {}
               }
            }
         } else {}
      })
      // reset limit
      cron.schedule('00 00 * * *', () => {
         setting.lastReset = new Date * 1
         global.db.users.filter(v => v.limit < global.limit && !v.premium).map(v => v.limit = global.limit)
         Object.entries(global.db.statistic).map(([_, prop]) => prop.today = 0)
      }, {
         scheduled: true,
         timezone: global.timezone
      })
      if (m.isGroup && !m.fromMe) {
         let now = new Date() * 1
         if (!groupSet.member[m.sender]) {
            groupSet.member[m.sender] = {
               lastseen: now,
               warning: 0
            }
         } else {
            groupSet.member[m.sender].lastseen = now
         }
      }
      if (!m.fromMe && m.isBot && m.mtype == 'audioMessage' && m.msg.ptt) return clips.sendMessage(m.chat, {
         delete: {
            remoteJid: m.chat,
            fromMe: false,
            id: m.key.id,
            participant: m.sender
         }
      })
      let getPrefix = body ? body.charAt(0) : ''
      let isPrefix = (setting.multiprefix ? setting.prefix.includes(getPrefix) : setting.onlyprefix == getPrefix) ? getPrefix : undefined
      component.Logs(clips, m, isPrefix)
      if (m.isBot || m.chat.endsWith('broadcast')) return
      clips.ev.on('presence.update', update => {
         const {
            id,
            presences
         } = update
         if (id.endsWith('g.us')) {
            for (let jid in presences) {
               if (!presences[jid] || jid == clips.decodeJid(clips.user.id)) continue
               if ((presences[jid].lastKnownPresence === 'composing' || presences[jid].lastKnownPresence === 'recording') && global.db.users.find(v => v.jid == jid) && global.db.users.find(v => v.jid == jid).afk > -1) {
                  clips.reply(id, `System detects activity from @${jid.replace(/@.+/, '')} after being offline for : ${Func.texted('bold', Func.toTime(new Date - global.db.users.find(v => v.jid == jid).afk))}\n\n➠ ${Func.texted('bold', 'Reason')} : ${global.db.users.find(v => v.jid == jid).afkReason ? global.db.users.find(v => v.jid == jid).afkReason : '-'}`, global.db.users.find(v => v.jid == jid).afkObj)
                  global.db.users.find(v => v.jid == jid).afk = -1
                  global.db.users.find(v => v.jid == jid).afkReason = ''
                  global.db.users.find(v => v.jid == jid).afkObj = {}
               }
            }
         } else {}
      })
      if (((m.isGroup && !groupSet.mute) || !m.isGroup) && !users.banned) {
         if (body && body == isPrefix) {
            if (m.isGroup && groupSet.mute || !isOwner) return
            let old = new Date()
            let banchat = setting.self ? true : false
            if (!banchat) {
               await clips.reply(m.chat, Func.texted('bold', `Checking . . .`), FakeLoc, { montions: m.sender })
               return clips.reply(m.chat, Func.texted('bold', `Response Speed: ${((new Date - old) * 1)}ms`), FakeLoc, { montions: m.sender })
            } else {
               await clips.reply(m.chat, Func.texted('bold', `Checking . . .`), FakeLoc, { montions: m.sender })
               return clips.reply(m.chat, Func.texted('bold', `Response Speed: ${((new Date - old) * 1)}ms (nonaktif)`), FakeLoc, { montions: m.sender })
            }
         }
      }
      const commands = Func.arrayJoin(Object.values(Object.fromEntries(Object.entries(plugins).filter(([name, prop]) => prop.run.noxious))).map(v => v.run.noxious)).concat(Func.arrayJoin(Object.values(Object.fromEntries(Object.entries(plugins).filter(([name, prop]) => prop.run.hidden))).map(v => v.run.hidden)))
      const args = body && body.replace(isPrefix, '').split` `.filter(v => v)
      const command = args && args.shift().toLowerCase()
      const clean = body && body.replace(isPrefix, '').trim().split` `.slice(1)
      const text = clean ? clean.join` ` : undefined
      const prefixes = global.db.setting.multiprefix ? global.db.setting.prefix : [global.db.setting.onlyprefix]
      let matcher = Func.matcher(command, commands).filter(v => v.accuracy >= 60)
      if (isPrefix && !commands.includes(command) && matcher.length > 0 && !setting.self) {
         if (!m.isGroup || (m.isGroup && !groupSet.mute)) return clips.reply(m.chat, `Perintah yang Anda gunakan salah, coba rekomendasi berikut ini :\n\n${matcher.map(v => '➠ *' + (isPrefix ? isPrefix : '') + v.string + '* (' + v.accuracy + '%)').join('\n')}`, FakeLoc, { montions: m.sender })
      }
      if (body && isPrefix && commands.includes(command) || body && !isPrefix && commands.includes(command) && setting.noprefix || body && !isPrefix && commands.includes(command) && global.evaluate_chars.includes(command)) {
         const is_commands = Object.fromEntries(Object.entries(plugins).filter(([name, prop]) => prop.run.noxious))
         try {
            if (new Date() * 1 - chats.command > (global.cooldown * 1000)) {
               chats.command = new Date() * 1
            } else {
               if (!m.fromMe) return
            }
         } catch (e) {
            global.db.chats.push({
               jid: m.chat,
               chat: 1,
               lastchat: 0,
               lastseen: new Date() * 1,
               command: new Date() * 1
            })
         }
      if (m.isGroup) {
         if (commands.includes(command)) {
            groupSet.member[m.sender].chat += 1
         }
       }
         if (setting.error.includes(command) && !setting.self) return clips.reply(m.chat, Func.texted('bold', `Perintah _${(isPrefix ? isPrefix : '') + command}_ dinonaktifkan.`), FakeLoc, { montions: m.sender })
         if (commands.includes(command)) {
            users.hit += 1
            users.usebot = new Date() * 1
            Func.hitstat(command, m.sender)
         }
         for (let name in is_commands) {
            let cmd = is_commands[name].run
            let turn = cmd.noxious instanceof Array ? cmd.noxious.includes(command) : cmd.noxious instanceof String ? cmd.noxious == command : false
            let turn_hidden = cmd.hidden instanceof Array ? cmd.hidden.includes(command) : cmd.hidden instanceof String ? cmd.hidden == command : false
            if (body && global.evaluate_chars.some(v => body.startsWith(v)) && !body.startsWith(isPrefix)) return
            if (!turn && !turn_hidden) continue
            if (!m.isGroup && global.blocks.some(no => m.sender.startsWith(no))) return clips.updateBlockStatus(m.sender, 'block')
            if (setting.self && !isOwner && !m.fromMe) return
            if (setting.pluginDisable.includes(name)) return clips.reply(m.chat, Func.texted('bold', `Fitur dinonaktikan oleh Owner.`), FakeLoc, { montions: m.sender })
            if (!m.isGroup && !['owner'].includes(name) && chats && !isPrem && !users.banned && new Date() * 1 - chats.lastchat < global.timer) continue
            if (!m.isGroup && !['owner', 'menfess', 'verify', 'verifymail'].includes(name) && chats && !isPrem && !users.banned && setting.groupmode) return clips.sendMessageModify(m.chat, `⚠️ Using bot in private chat only for premium user, upgrade to premium plan only Rp. 10,000,- to get 3K limits for 1 month.\n\nIf you want to buy contact *${prefixes[0]}owner*`, FakeLoc, {
               largeThumb: true,
               thumbnail: await Func.fetchBuffer('https://iili.io/JTRzjBS.jpg'),
               url: setting.link
            }).then(() => chats.lastchat = new Date() * 1)
            if (!['verify', 'exec'].includes(name) && !m.isGroup && users && !users.banned && !users.verified && setting.verify) users.attempt += 1
            let teks = `*[ ${users.attempt} / 5 ]* Verifikasi nomor dengan menggunakan nama dan umur, Silahkan ikuti step by step berikut :\n\n– *STEP 1*\nGunakan perintah *${isPrefix ? isPrefix : ''}reg <name.age>* untuk mendapatkan kode verifikasi melalui foto.\nContoh : *${isPrefix ? isPrefix : ''}reg Kens.22*\n\n– *STEP 2*\nGunakan perintah *${isPrefix ? isPrefix : ''}ceksn* untuk mendapatkan CODE SERIAL ketika kalian registrasi melakukan kesalahan saat mendaftar code ini berguna.\n\n– *STEP 3*\nGunakan perintah *${isPrefix ? isPrefix : ''}unreg <CODE SERIAL>*untuk mendapatkan CODE SERIAL kalian bisa ikutin step ke 2.\n\n*Note* :\nMengabaikan pesan ini sebanyak *5x* kamu akan di banned dan di blokir, untuk membuka banned dan blokir dikenai biaya sebesar Rp. 10,000`
            if (users && !users.banned && !users.verified && users.attempt >= 5 && setting.verify) return clips.reply(m.isGroup ? m.sender : m.chat, Func.texted('bold', `🚩 [ ${users.attempt} / 5 ] : Kamu mengabaikan pesan verifikasi tapi tenang masih ada bot lain kok, banned thanks. (^_^)`), FakeLoc, { montions: m.sender}).then(() => {
               users.banned = true
               users.attempt = 0
               users.code = ''
               users.age = -1
               users.names = ''
               clips.updateBlockStatus(m.sender, 'block')
            })
            if (!['verify', 'exec'].includes(name) && !m.isGroup && users && !users.banned && !users.verified && setting.verify) return clips.sendMessageModify(m.chat, teks, FakeLoc, {
               largeThumb: true,
               thumbnail: await Func.fetchBuffer('https://iili.io/JTRzjBS.jpg')
            }, { montions: m.sender })
            if (!['verify', 'exec'].includes(name) && m.isGroup && users && !users.banned && !users.verified && setting.verify) return clips.reply(m.chat, `Nomor Anda belum terverifikasi, verifikasi dengan mengirimkan *${isPrefix ? isPrefix : ''}reg <nama.age>*.`, FakeLoc, { montions: m.sender })
            if (!['me', 'owner', 'exec'].includes(name) && users && (users.banned || new Date - users.banTemp < global.timer)) return
            if (!['verifymail', 'exec'].includes(name) && !m.isGroup && users && !users.banned && !users.verifiedmail && setting.verifymail) users.attempt += 1
            let te = `*[ ${users.attempt} / 5 ]* Verifikasi nomor dengan menggunakan email, Silahkan ikuti step by step berikut :\n\n– *STEP 1*\nGunakan perintah *${isPrefix ? isPrefix : ''}regmail <mail@gmail.com>*\nContoh : *${isPrefix ? isPrefix : ''}regmail nexonnjs@gmail.com*\n\n– *STEP 2*\n Buka email dan cek pesan masuk atau di folder spam, setelah kamu mendapat kode verifikasi silahkan kirim kode tersebut kepada bot.\n\n– *STEP 3*\nGunakan perintah *${isPrefix ? isPrefix : ''}snmail* untuk mendapatkan CODE SERIAL ketika kalian registrasi melakukan kesalahan saat mendaftar code ini berguna.\n\n– *STEP 4*\nGunakan perintah *${isPrefix ? isPrefix : ''}unmail <CODE SERIAL>*untuk mendapatkan CODE SERIAL kalian bisa ikutin step ke 3.\n\n*Note* :\nMengabaikan pesan ini sebanyak *5x* kamu akan di banned dan di blokir, untuk membuka banned dan blokir dikenai biaya sebesar Rp. 10,000`
            if (users && !users.banned && !users.verifiedmail && users.attempt >= 5 && setting.verifymail) return clips.reply(m.isGroup ? m.sender : m.chat, Func.texted('bold', `🚩 [ ${users.attempt} / 5 ] : Kamu mengabaikan pesan verifikasi tapi tenang masih ada bot lain kok, banned thanks. (^_^)`), FakeLoc, { montions: m.sender}).then(() => {
               users.banned = true
               users.attempt = 0
               users.codemail = ''
               users.codeExpire = 0
               users.email = ''
               clips.updateBlockStatus(m.sender, 'block')
            })
            if (!['verifymail', 'exec'].includes(name) && !m.isGroup && users && !users.banned && !users.verifiedmail && setting.verifymail) return clips.sendMessageModify(m.chat, te, FakeLoc, {
               largeThumb: true,
               thumbnail: await Func.fetchBuffer('https://iili.io/JTRzjBS.jpg')
            }, { montions: m.sender })
            if (!['verifymail', 'exec'].includes(name) && m.isGroup && users && !users.banned && !users.verifiedmail && setting.verifymail) return clips.reply(m.chat, `Nomor Anda belum terverifikasi, verifikasi dengan mengirimkan *${isPrefix ? isPrefix : ''}regmail <mail@gmail.com>*.`, FakeLoc, { montions: m.sender })
            if (m.isGroup && !['activation', 'groupinfo', 'exec', 'makeAdmin'].includes(name) && groupSet.mute) continue
            if (m.isGroup && !isOwner && /chat.whatsapp.com/i.test(text)) return clips.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            if (cmd.cache && cmd.location) {
               let file = require.resolve(cmd.location)
               Func.reload(file)
            }
            if (cmd.error) {
               clips.reply(m.chat, global.status.errorF, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.restrict && !isOwner && text && new RegExp('\\b' + global.db.setting.toxic.join('\\b|\\b') + '\\b').test(text.toLowerCase())) {
               clips.reply(m.chat, `Anda melanggar *Syarat & Ketentuan* penggunaan bot dengan menggunakan kata kunci yang masuk daftar hitam, sebagai hukuman atas pelanggaran Anda diblokir dan dilarang menggunakan bot. Untuk membuka blokir dan membatalkan pemblokiran Anda harus membayar *Rp. 10,000,-* atau silahkan hubungi owner`, FakeLoc, { montions: m.sender }).then(() => {
                  users.banned = true
                  clips.updateBlockStatus(m.sender, 'block')
               })
               continue
            }
            if (cmd.owner && !isOwner) {
               clips.reply(m.chat, global.status.owner, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.auth && !isAuth) {
               clips.reply(m.chat, global.status.auth, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.premium && !isPrem) {
               clips.reply(m.chat, global.status.premium, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.limit && users.limit < 1) {
               return clips.sendMessageModify(m.chat, `Limit penggunaan bot mu sudah habis dan akan di reset pada pukul 00.00 WIB\n\nUntuk mendapatkan lebih banyak limit upgrade ke premium kirim *${prefixes[0]}premium*`, FakeLoc, {
               largeThumb: true,
               thumbnail: await Func.fetchBuffer('https://iili.io/JTRzjBS.jpg')
            },  { montions: m.sender }).then(() => users.premium = false)
               continue
            }
            if (cmd.limit && users.limit > 0) {
               let limit = cmd.limit.constructor.name == 'Boolean' ? 1 : cmd.limit
               if (users.limit >= limit) {
                  users.limit -= limit
               } else {
                  clips.reply(m.chat, Func.texted('bold', `Limit Anda tidak cukup untuk menggunakan fitur ini.`), FakeLoc, { montions: m.sender })
                  continue
               }
            }
            if (cmd.group && !m.isGroup) {
               clips.reply(m.chat, global.status.group, FakeLoc, { montions: m.sender })
               continue
            } else if (cmd.botAdmin && !isBotAdmin) {
               clips.reply(m.chat, global.status.botAdmin, FakeLoc, { montions: m.sender })
               continue
            } else if (cmd.admin && !isAdmin) {
               clips.reply(m.chat, global.status.admin, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.private && m.isGroup) {
               clips.reply(m.chat, global.status.private, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.game && !setting.games) {
               clips.reply(m.chat, global.status.gameSystem, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.game && Func.level(users.point, global.multiplier)[0] >= 50) {
               clips.reply(m.chat, global.status.gameLevel, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.game && m.isGroup && !groupSet.game) {
               clips.reply(m.chat, global.status.gameInGroup, FakeLoc, { montions: m.sender })
               continue
            }
            if (cmd.nsfw && m.isGroup && !groupSet.nsfw) {
               clips.reply(m.chat, global.status.nsfwInGroup, FakeLoc, { montions: m.sender })
               continue
            }
            cmd.async(m, {
               clips,
               args,
               text,
               isPrefix: isPrefix ? isPrefix : '',
               command,
               participants,
               blockList,
               isPrem,
               isOwner,
               isAdmin,
               isBotAdmin,
               users,
               chats,
               groupSet,
               setting,
               plugins,
               store
            })
            break
         }
      } else {
         let prefixes = setting.multiprefix ? setting.prefix : [setting.onlyprefix]
         const is_events = Object.fromEntries(Object.entries(plugins).filter(([name, prop]) => !prop.run.noxious))
         for (let name in is_events) {
            let event = is_events[name].run
            if (event.cache && event.location) {
               let file = require.resolve(event.location)
               Func.reload(file)
            }
            if (!m.isGroup && global.blocks.some(no => m.sender.startsWith(no))) return clips.updateBlockStatus(m.sender, 'block')
            if (m.isGroup && !['exec'].includes(name) && groupSet.mute) continue
            if (setting.pluginDisable.includes(name)) continue
            if (!m.isGroup && chats && !isPrem && !users.banned && new Date() * 1 - chats.lastchat < global.timer) continue
            if (!m.isGroup && chats && !isPrem && !users.banned && !['chatAI'].includes(name) && setting.groupmode) return clips.sendMessageModify(m.chat, `Menggunakan bot dalam obrolan pribadi hanya untuk pengguna premium, tingkatkan ke paket premium hanya Rp. 10,000,- untuk mendapatkan limit 3K selama 1 bulan.\n\nUntuk melihat harga sewa bot join group silahkan kunjungi website mikobotzinfo.my.id\n\n Jika anda memiliki pertanyaan silahkan hubungi *${prefixes[0]}owner*`, FakeLoc, {
               largeThumb: true,
               thumbnail: await Func.fetchBuffer('https://iili.io/JTRzjBS.jpg'),
               url: setting.link
            },  { montions: m.sender }).then(() => chats.lastchat = new Date() * 1)
            if (setting.self && !['chatAI', 'exec'].includes(name) && !isOwner && !m.fromMe) continue
            if (!m.isGroup && ['chatAI'].includes(name) && body && Func.socmed(body)) continue
            if (!['exec', 'restrict'].includes(name) && users && users.banned) continue
            if (!['anti_link', 'anti_tagall', 'anti_virtex', 'filter', 'exec'].includes(name) && users && (users.banned || new Date - users.banTemp < global.timer)) continue
            if (!['anti_link', 'anti_tagall', 'anti_virtex', 'filter', 'exec'].includes(name) && groupSet && groupSet.mute) continue
            if (event.error) continue
            if (event.owner && !isOwner) continue
            if (event.group && !m.isGroup) continue
            if (event.limit && users.limit < 1) continue
            if (event.botAdmin && !isBotAdmin) continue
            if (event.admin && !isAdmin) continue
            if (event.private && m.isGroup) continue
            if (event.download && users && !users.verified && body && Func.socmed(body) && setting.verify) return clips.reply(m.chat, `Nomor Anda belum terverifikasi, verifikasi dengan mengirimkan *${isPrefix ? isPrefix : ''}reg <name.age>*.`, FakeLoc, { montions: m.sender })
            if (event.download && users && !users.verifiedmail && body && Func.socmed(body) && setting.verifymail) return clips.reply(m.chat, `Nomor Anda belum terverifikasi, verifikasi dengan mengirimkan *${isPrefix ? isPrefix : ''}regmail <mail@gmail.com>*.`, FakeLoc, { montions: m.sender })
            if (event.download && (!setting.autodownload || (body && global.evaluate_chars.some(v => body.startsWith(v))))) continue
            if (event.premium && !isPrem && body && Func.socmed(body)) return clips.reply(m.chat, global.status.premium, FakeLoc)
            if (event.game && !setting.games) continue
            if (event.game && Func.level(users.point, global.multiplier)[0] >= 50) continue
            if (event.game && m.isGroup && !groupSet.game) continue
            event.async(m, {
               clips,
               body,
               participants,
               prefixes,
               isOwner,
               isAdmin,
               isBotAdmin,
               users,
               chats,
               groupSet,
               groupMetadata,
               setting,
               plugins,
               store
            })
         }
      }
   } catch (e) {
   console.log(e)
     // m.reply(Func.jsonFormat(e))
   }
}

Func.reload(require.resolve(__filename))