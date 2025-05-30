import {config} from './config.js'
import { exec } from 'child_process'

exec(`fuser -k ${config.port}/tcp`, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error stopping process: ${stderr}`);
  } else {
    console.log(`Stopped process using port ${config.port}:\n${stdout}`);
  }
});