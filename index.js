const dasha = require("@dasha.ai/sdk");
const fs = require("fs");
const express= require('express')
const cors  = require('cors')
const port = 3000

const ser = express()
ser.use(cors())
ser.use(express.urlencoded({ extended: false }));

ser.get('/start',(req,res)=>{
  main().catch(() => {});
   res.json({
       message:"Server is listening.."
   })
})

ser.listen(port,()=> console.log(`running ${port}`))

async function main() {
  const app = await dasha.deploy("./app");

  app.connectionProvider = async (conv) =>
    conv.input.phone === "chat"
      ? dasha.chat.connect(await dasha.chat.createConsoleChat())
      : dasha.sip.connect(new dasha.sip.Endpoint("default"));

  app.ttsDispatcher = () => "dasha";

  await app.start();

  const conv = app.createConversation({
    phone: process.argv[2],
  });
  
  

  if (conv.input.phone !== "chat") conv.on("transcription", console.log);

  const logFile = await fs.promises.open("./log.txt", "w");
  await logFile.appendFile("#".repeat(100) + "\n");

  conv.on("transcription", async (entry) => {
    await logFile.appendFile(`${entry.speaker}: ${entry.text}\n`);
  });

  conv.on("debugLog", async (event) => {
    if (event?.msg?.msgId === "RecognizedSpeechMessage") {
      const logEntry = event?.msg?.results[0]?.facts;
      await logFile.appendFile(JSON.stringify(logEntry, undefined, 2) + "\n");
    }
  });

  const result = await conv.execute();

  console.log(result.output);

  await app.stop();
  app.dispose();

  await logFile.close();
}


