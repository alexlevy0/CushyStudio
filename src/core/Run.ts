import type { Project } from './Project'

import * as path from '@tauri-apps/api/path'
import * as fs from '@tauri-apps/api/fs'
import { ScriptStep_prompt } from './ScriptStep_prompt'
import { deepCopyNaive, Maybe } from './ComfyUtils'
import { ComfyGraph } from './ComfyGraph'
import { ApiPromptInput, WsMsgExecuted } from './ComfyAPI'
import { ScriptStep_Init } from './ScriptStep_Init'
import { ScriptStep_askBoolean, ScriptStep_askString } from './ScriptStep_ask'
import { ScriptStep } from './ScriptStep'
import { makeAutoObservable } from 'mobx'
import { nanoid } from 'nanoid'
import { fetch, Body } from '@tauri-apps/api/http'
import { CSImage } from './CSImage'
import { Cyto } from '../ui/graph/cyto'
import { getYYYYMMDD_HHMM_SS } from '../utils/timestamps'

/** script exeuction instance */
export class Run {
    /** creation "timestamp" in YYYYMMDDHHMMSS format */
    createdAt = getYYYYMMDD_HHMM_SS()

    /** unique run id */
    uid = nanoid()

    /** human readable folder name */
    name: string

    /** the main graph that will be updated along the script execution */
    graph: ComfyGraph

    /** graph engine instance for smooth and clever auto-layout algorithms */
    cyto: Cyto

    /** list of all images produed over the whole script execution */
    gallery: CSImage[] = []

    /** folder where CushyStudio will save run informations */
    get folderPath() {
        return this.script.folderPath + path.sep + this.createdAt + '_' + this.name
    }

    /** save current script */
    save = async () => {
        const contents = this.script.code
        // ensure folder exists
        await fs.createDir(this.folderPath, { recursive: true })
        // safe script as script.ts
        const backupCodePath = 'script.' + Date.now() + '.ts'
        const filePath = this.folderPath + path.sep + backupCodePath
        await fs.writeFile({ path: filePath, contents })
        // return success
        console.log('[📁] script backup saved', filePath)
    }

    constructor(
        //
        public script: Project,
        public opts?: { mock?: boolean },
    ) {
        this.name = 'Run ' + this.script.runCounter++
        this.graph = new ComfyGraph(this.script, this)
        this.cyto = new Cyto(this.graph)
        makeAutoObservable(this)
    }

    steps: ScriptStep[] = [new ScriptStep_Init()]

    /** current step */
    get step(): ScriptStep {
        return this.steps[0]
    }

    askBoolean = (msg: string, def?: Maybe<boolean>): Promise<boolean> => {
        const ask = new ScriptStep_askBoolean(msg, def)
        this.steps.unshift(ask)
        return ask.finished
    }

    askString = (msg: string, def?: Maybe<string>): Promise<string> => {
        const ask = new ScriptStep_askString(msg, def)
        this.steps.unshift(ask)
        return ask.finished
    }

    /** outputs are both stored in ScriptStep_prompt, and on ScriptExecution */
    outputs: WsMsgExecuted[] = []

    sendPromp = (): ScriptStep_prompt => {
        // console.log('XX1')
        // console.log('🔴', toJS(this.graph.json))
        // console.log('XX2')
        const currentJSON = deepCopyNaive(this.graph.json)
        console.log('[🪜] checkpoint', currentJSON)
        const step = new ScriptStep_prompt(this, currentJSON)
        this.steps.unshift(step)

        // if we're note really running prompts, just resolve the step and continue
        if (this.opts?.mock) {
            step._resolve!(step)
            return step
        }

        // 🔴 TODO: store the whole project in the prompt
        const out: ApiPromptInput = {
            client_id: this.script.workspace.sid,
            extra_data: { extra_pnginfo: { it: 'works' } },
            prompt: currentJSON,
        }

        // 🔶 not waiting here, because output comes back from somewhere else
        // TODO: but we may want to catch error here to fail early
        // otherwise, we might get stuck
        void fetch(`${this.script.workspace.serverHostHTTP}/prompt`, {
            method: 'POST',
            body: Body.json(out),
        })

        // await sleep(1000)
        return step
    }

    ctx = {}
}