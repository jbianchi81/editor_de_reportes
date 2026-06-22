#!/usr/bin/env node

import {getLastValues} from './utils.js'
import {Command} from "commander";
import {config} from './config.js'
import {writeFileSync} from 'fs'

const program = new Command();

program
  .name("reportes")
  .description("CLI de reportes")
  .version("1.0.0");

program
  .command("get-last-values")
  .alias("g")
  .description("Get last values of variable")
  .argument("<var_id>", "variable id (int)")
  .argument("[estacion_id...]", "estacion id (one or more integers)", config.station_ids)
  .option("-o, --output <output>", "output file")
  .action(async (var_id: string, estacion_id : number[]|string[], options : {output?: string}) => {
    const values = await getLastValues(estacion_id.map(e=>parseInt(e.toString())), parseInt(var_id))
    if(options.output) {
        writeFileSync(options.output, JSON.stringify(values, undefined, 2))
    } else {
        console.log(JSON.stringify(values, undefined, 2))
    }    
  });

program.parse();
