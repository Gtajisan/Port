module.exports = {
config: {
name: "ss",
author: "Tawsif",
role: 0,
category: "Image"
},
onStart: async function ({ message, args}) {

message.reply({
attachment: await global.utils.getStreamFromURL(`https://image.thum.io/get/width/1920/crop/1080/fullpage/${args[0]}`)
})
}
}