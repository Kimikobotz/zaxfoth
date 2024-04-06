process.on('uncaughtException', console.error)
require('./system/config'), require('events').EventEmitter.defaultMaxListeners = 100
const pino = require('pino'),
   path = require('path'),
   colors = require('@colors/colors/safe'),
   qrcode = require('qrcode-terminal'),
   axios = require('axios'),
   spinnies = new(require('spinnies'))(),
   fs = require('fs'),
   chalk = require('chalk'),
   baileys = fs.existsSync('./node_modules/baileys') ? 'baileys' : fs.existsSync('./node_modules/@adiwajshing/baileys') ? '@adiwajshing/baileys' : 'bails'
const { useMultiFileAuthState, DisconnectReason, makeInMemoryStore, msgRetryCounterMap, delay, PHONENUMBER_MCC } = require(baileys)
global.component = new (require('nexon-wajs'))
const { Baileys, MongoDB } = component
const { Socket, Serialize, Scandir } = Baileys
const { exec, spawn } = require("child_process");
global.props = (/mongo/.test(global.nex.MongoData)) ? MongoDB : new(require('./system/localdb'))(global.database)

const store = makeInMemoryStore({
   logger: pino().child({
      level: 'silent', 
      stream: 'store'
    })
})

global.CAPI = (name, path = '/', query = {}, apikeyqueryname) => (name in global.CAPIs ? global.CAPIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.CAPIKeys[name in global.CAPIs ? global.CAPIs[name] : name] } : {}) })) : '')

async function connect() {
const { state, saveCreds } = await useMultiFileAuthState(`./session`)
global.db = {users:[], chats:[], groups:[], bots:[], statistic:{}, sticker:{}, setting:{}, menfess:{}, ...(await props.fetch() ||{})}
   await props.save(global.db)
   
const config = JSON.parse(fs.readFileSync('./pairing.json', 'utf-8'))
global.clips = Socket({
   logger: pino({
     level: 'silent'
  }),
  printQRInTerminal: (config.pairing && config.pairing.state && config.pairing.number) ? false : true,
    patchMessageBeforeSending: (message) => {
       const requiresPatch = !!(
          message.buttonsMessage ||
          message.templateMessage ||
          message.listMessage
       );
       if (requiresPatch) {
           message = {
              viewOnceMessage: {
                 message: {
                    messageContextInfo: {
                       deviceListMetadataVersion: 2,
                       deviceListMetadata: {},
                    },
                    ...message,
                 },
              },
           }
        }
        return message
    },
     browser: ['Chrome (Linux)', '', ''],
     auth: state,
     getMessage: async (key) => {
        if (store) {
          const msg = await store.loadMessage(key.remoteJid, key.id)
          return msg.message || undefined
       }
      return {
          conversation: 'hello'
       }
   },
      // To see the latest version : https://web.whatsapp.com/check-update?version=1&platform=web
      version: [2, 2403, 4]
  })
    store.bind(clips.ev)
    spinnies.add('start', {
          text: 'Connecting . . .'
     })

  if (config.pairing && config.pairing.state && !clips.authState.creds.registered) {
    var phoneNumber = config.pairing.number
  if (!Object.keys(PHONENUMBER_MCC).some(v => String(phoneNumber).startsWith(v))) {
       spinnies.fail('start', {
          text: `Invalid number, start with country code (Example : 62xxx)`
       })
        process.exit(0)
    }
  setTimeout(async () => {
     try {
       let code = await clips.requestPairingCode(phoneNumber)
           code = code.match(/.{1,4}/g)?.join("-") || code
           console.log(chalk.black(chalk.bgGreen(` Your Pairing Code `)), ' : ' + chalk.black(chalk.white(code)))
         } catch {}
      }, 3000)
   }
        
  clips.ev.on('connection.update', async (update) => {
      const {
         connection,
         lastDisconnect,
         qr,
         receivedPendingNotifications,
         isOnline, 
         isNewLogin 
      } = update
      if (connection === 'connecting') {
      if (global.db.bots.length > 0) global.db.bots.map(v => v.is_connected = false)
     } else if (connection === 'open') {
         spinnies.succeed('start', {
            text: `Connected, you login as ${clips.user.name || clips.user.verifiedName || 'WhatsApp Bot'}`
         })
      } else if (connection === 'close') {
         if (lastDisconnect.error.output.statusCode == DisconnectReason.loggedOut) {
            spinnies.fail('start', {
               text: `Can't connect to Web Socket`
            })
            await props.save()
            process.exit(0)
         } else {
            connect().catch(() => connect())
         }
      }
   })
         
  clips.ev.on('creds.update', saveCreds)
  clips.ev.on('messages.upsert', async chatUpdate => {
     try {
       let m = chatUpdate.messages[0]
       if (!m.message) return
       Serialize(clips, m)
       const files = await Scandir('./plugins')
       const plugins = Object.fromEntries(files.filter(v => v.endsWith('.js')).map(file => [path.basename(file).replace('.js', ''), require(file)]))
       require('./system/svcop'), require('./system/function'), require('./system/baileys'), require('./handler')(clips, m, plugins, store)
         } catch (e) {
          console.log(e)
       }
   })
      
      
  clips.ev.on('contacts.update', update => {
      for (let contact of update) {
         let id = clips.decodeJid(contact.id)
         if (store && store.contacts) store.contacts[id] = {
            id,
            name: contact.notify
         }
      }
   })
                
   clips.ev.on('group-participants.update', async (room) => {
        let meta = await (await clips.groupMetadata(room.id))
        let member = room.participants[0]
        let fuv = global.db.users.find(v => v.jid == member)
        let text_welcome = `Thanks +tag for joining into +grup group.`
        let text_left = `+tag left from this group for no apparent reason.`
        let groupSet = global.db.groups.find(v => v.jid == room.id)
        let FakeLoc = {
             key: {
               fromMe: false,
                participant: `0@s.whatsapp.net`,
                ...(room.id ? {
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
        let pic
         try {
           pic = await Func.fetchBuffer(await clips.profilePictureUrl(member, 'image'))
         } catch {
           pic = await Func.fetchBuffer('./media/image/default.jpg')
       }
  if (room.action == 'add') {
  var images = await Api.welcome(pic, 'NEXON BOT')
  if (groupSet && groupSet.localonly) {
  if (global.db.users.some(v => v.jid == member) && !global.db.users.find(v => v.jid == member).whitelist && !member.startsWith('62') || !member.startsWith('62')) {
      clips.reply(room.id, Func.texted('bold', `Sorry @${member.split`@`[0]}, this group is only for indonesian people and you will removed automatically.`))
      clips.updateBlockStatus(member, 'block')
          return await Func.delay(2000).then(() => clips.groupParticipantsUpdate(room.id, [member], 'remove'))
      }
   }  
   let txt = (groupSet && groupSet.text_welcome != '' ? groupSet.text_welcome : text_welcome).replace('+tag', `@${member.split`@`[0]}`).replace('+grup', `${meta.subject}`)
   if (groupSet && groupSet.welcome) clips.sendMessageModify(room.id, txt, FakeLoc, {
      largeThumb: true,
      thumbnail: images,
      url: global.db.setting.link
   })
  } else if (room.action == 'remove') {
  var images = await Api.leave(pic, 'NEXON BOT')
   let txt = (groupSet && groupSet.text_left != '' ? groupSet.text_left : text_left).replace('+tag', `@${member.split`@`[0]}`).replace('+grup', `${meta.subject}`)
  if (groupSet && groupSet.left) clips.sendMessageModify(room.id, txt, FakeLoc, {
      largeThumb: true,
      thumbnail: images,
      url: global.db.setting.link
   })
  }
 })
             
 clips.ws.on('CB:call', async json => {
     if (json.content[0].tag == 'offer') {
       let object = json.content[0].attrs['call-creator']
        clips.reply(object, `You are prohibited from calling or video calling, we will automatically block you`)
         await Func.delay(2000)
         await clips.updateBlockStatus(object, 'block')
       }
  })
                                       
  setInterval(async () => {
     const tmpFiles = fs.readdirSync('./temp')
       if (tmpFiles.length > 0) tmpFiles.map(v => fs.unlinkSync('./temp/' + v))
     }, 100 * 1000 * 5)
           
  setInterval(async () => {
       if (global.db) await props.save(global.db)
     }, 30_000)
   
   return clips
}
connect().catch(() => connect())

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})