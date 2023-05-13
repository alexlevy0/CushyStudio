import type { LATER } from '../back/LATER'

import FormData from 'form-data'
import { marked } from 'marked'
import { makeAutoObservable } from 'mobx'
import { nanoid } from 'nanoid'
import fetch from 'node-fetch'
import * as path from 'path'
// import { Cyto } from '../graph/cyto' 🔴🔴
import { execSync } from 'child_process'
import { InfoAnswer, InfoRequestBuilder, InfoRequestFn } from '../controls/askv2'
import { Requestable } from '../controls/Requestable'
import { ScriptStep_Init } from '../controls/ScriptStep_Init'
import { ScriptStep_ask } from '../controls/ScriptStep_ask'
import { PromptExecution } from '../controls/ScriptStep_prompt'
import { runAutolayout } from '../core/AutolayoutV2'
import { Graph } from '../core/Graph'
import { convertFlowToLiteGraphJSON } from '../core/LiteGraph'
import type { FlowParam } from '../core/ParamDef'
import { Printable } from '../core/Printable'
import { ApiPromptInput, ComfyUploadImageResult, WsMsgExecuted } from '../types/ComfyWsApi'
import { FlowExecutionStep } from '../types/FlowExecutionStep'
import { logger } from '../logger/logger'
import { deepCopyNaive } from '../utils/ComfyUtils'
import { AbsolutePath, RelativePath } from '../utils/fs/BrandedPaths'
import { asAbsolutePath, asRelativePath } from '../utils/fs/pathUtils'
import { HTMLContent, MDContent, asHTMLContent, asMDContent } from '../utils/markdown'
import { getYYYYMMDDHHMMSS } from '../utils/timestamps'
import { wildcards } from '../wildcards/wildcards'
import { GeneratedImage } from './GeneratedImage'
import { RANDOM_IMAGE_URL } from './RANDOM_IMAGE_URL'
import { ServerState } from './ServerState'
import { createMP4FromImages } from '../ffmpeg/ffmpegScripts'
import { readFileSync, writeFileSync } from 'fs'
import { NodeBuilder } from './NodeBuilder'

/** script exeuction instance */
export class FlowRun {
    /** creation "timestamp" in YYYYMMDDHHMMSS format */
    createdAt = getYYYYMMDDHHMMSS()

    /** unique run id */
    uid = nanoid()

    /** human readable folder name */
    name: string

    /** list all actions ; codegen during dev-time */
    actions: any

    /** x:string */
    find = (foo: string) => {
        // 🔴
    }

    /** toolkit to build new graph nodes */
    nodes: NodeBuilder

    /** the main graph that will be updated along the script execution */
    graph: Graph

    /** graph engine instance for smooth and clever auto-layout algorithms */
    // cyto: Cyto 🔴🔴

    private params: FlowParam[] = []
    addParam = (p: FlowParam) => {
        this.params.push(p)
    }

    /** list of all images produed over the whole script execution */
    generatedImages: GeneratedImage[] = []
    get firstImage() { return this.generatedImages[0] } // prettier-ignore
    get lastImage() { return this.generatedImages[this.generatedImages.length - 1] } // prettier-ignore

    /** folder where CushyStudio will save run informations */
    get outputAbsPath(): AbsolutePath {
        return asAbsolutePath(path.join(this.workspace.cacheFolderPath, this.name))
    }

    folder: AbsolutePath

    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    // High level API--------------------

    saveTextFile = async (path: RelativePath, content: string): Promise<void> => {
        const absPath = this.workspace.resolve(path)
        writeFileSync(absPath, content, 'utf-8')
    }

    showHTMLContent = (p: { htmlContent: string; title: string }) => {
        this.workspace.broadCastToAllClients({ type: 'show-html', content: p.htmlContent, title: p.title })
    }

    showMarkdownContent = (p: { title: string; markdownContent: string }) => {
        const htmlContent = marked.parse(p.markdownContent)
        this.workspace.broadCastToAllClients({ type: 'show-html', content: htmlContent, title: p.title })
    }

    static VideoCounter = 1
    createAnimation = async (
        /** image to incldue (defaults to all images generated in the fun) */
        source?: GeneratedImage[],
        /** frame duration, in ms:
         * - default is 200 (= 5fps)
         * - use 16 for ~60 fps
         * */
        frameDuration = 200,
    ): Promise<void> => {
        const targetVideoAbsPath = asAbsolutePath(path.join(this.outputAbsPath, `video-${FlowRun.VideoCounter++}.mp4`))
        // logger().info(`target video path: ${targetVideoPath}`)
        // logger().info(`target video uri: ${targetVideoURI}`)
        const images = source ?? this.generatedImages
        // this.workspace.writeTextFile(targetVideoURI, JSON.stringify(currentJSON, null, 4))
        if (images.length === 0) {
            logger().error(`no images to create animation; did you forget to call prompt() first ?`)
            return
        }
        logger().info(`🎥 awaiting all files to be ready locally...`)
        await Promise.all(images.map((i) => i.ready))
        logger().info(`🎥 all files are ready locally`)
        const cwd = this.outputAbsPath
        logger().info(`🎥 target video path: ${targetVideoAbsPath}`)
        logger().info(`🎥 this.folder.path: ${this.folder}`)
        logger().info(`🎥 cwd: ${cwd}`)

        await createMP4FromImages(
            images.map((i) => i.localFileName),
            targetVideoAbsPath,
            frameDuration,
            cwd,
        )
        // const fromPath = curr.webview.asWebviewUri(targetVideoURI).toString()
        const videoURL = this.workspace.server.absPathToURL(targetVideoAbsPath)
        logger().info(`🎥 video url: ${videoURL}`)
        const content = `<video controls autoplay loop><source src="${videoURL}" type="video/mp4"></video>`
        this.workspace.broadCastToAllClients({ type: 'show-html', content, title: 'generated video' })
        // turns a bunch of images into a gif with ffmpeg
    }

    get flowSummaryMd(): MDContent {
        return asMDContent(
            [
                //
                // '# Flow summary\n',
                `<pre class="mermaid">`,
                this.graph.toMermaid(),
                `</pre>`,
            ].join('\n'),
        )
    }
    get flowSummaryHTML(): HTMLContent {
        // https://mermaid.js.org/config/usage.html
        return asHTMLContent(marked.parse(this.flowSummaryMd))
    }

    /** ensure a model is present, and download it if needed */
    ensureModel = async (p: { name: string; url: string }): Promise<void> => {
        return
    }

    /** ensure a custom onde is properly setup, and download/clone it if needed */
    ensureCustomNodes = async (p: { path: string; url: string }): Promise<void> => {
        return
    }

    writeFlowSummary = () => {
        const relPath = asRelativePath('flow-summary.md')
        this.saveTextFile(relPath, this.flowSummaryMd)
    }

    embedding = (t: LATER<'Embeddings'>) => `embedding:${t}`

    /** ask the user a few informations */
    ask: InfoRequestFn = async <const Req extends { [key: string]: Requestable }>(
        //
        requestFn: (q: InfoRequestBuilder) => Req,
        layout?: 0,
    ): Promise<{ [key in keyof Req]: InfoAnswer<Req[key]> }> => {
        const reqBuilder = new InfoRequestBuilder()
        const request = requestFn(reqBuilder)
        const ask = new ScriptStep_ask(request)
        this.workspace.broadCastToAllClients({ type: 'ask', request })
        this.steps.unshift(ask)
        return ask.finished
    }

    exec = (comand: string): string => {
        // promisify exec to run the command and collect the output
        this.print('🔥 exec: ' + comand)
        const cwd = this.workspace.rootPath
        console.log('cwd', cwd)
        const res = execSync(comand, { encoding: 'utf-8', cwd })
        return res
    }

    /** built-in wildcards */
    wildcards = wildcards

    /** pick a random seed */
    randomSeed() {
        const seed = Math.floor(Math.random() * 99999999)
        this.print('🔥 seed: ' + seed)
        return seed
    }

    private extractString = (message: Printable): string => {
        if (typeof message === 'string') return message
        if (typeof message === 'number') return message.toString()
        if (typeof message === 'boolean') return message.toString()
        if (typeof message === 'object')
            return `${message.$schema.nameInCushy}_${message.uid}(${JSON.stringify(message.json, null, 2)})`
        return '❓'
    }
    /** display something in the console */
    print = (message: Printable) => {
        let msg = this.extractString(message)
        logger().info(msg)
        this.workspace.broadCastToAllClients({ type: 'print', message: msg })
    }

    /** upload a file from disk to the ComfyUI backend */
    // uploadImgFromDisk = async (path: string): Promise<ComfyUploadImageResult> => {
    //     return this.workspace.uploadImgFromDisk(asRelativePath(path))
    // }

    resolveRelative = (path: string): RelativePath => asRelativePath(path)

    resolveAbsolute = (path: string): AbsolutePath => asAbsolutePath(path)

    range = (start: number, end: number, increment: number = 1): number[] => {
        const res = []
        for (let i = start; i < end; i += increment) res.push(i)
        return res
    }

    /** upload an image present on disk to ComfyServer */
    uploadAnyFile = async (path: AbsolutePath): Promise<ComfyUploadImageResult> => {
        const ui8arr: Uint8Array = readFileSync(path)
        return await this.uploadUIntArrToComfy(ui8arr)
    }

    /** upload an image present on disk to ComfyServer */
    uploadWorkspaceFile = async (path: RelativePath): Promise<ComfyUploadImageResult> => {
        const absPath = this.workspace.resolve(path)
        const ui8arr: Uint8Array = readFileSync(absPath)
        return await this.uploadUIntArrToComfy(ui8arr)
    }

    uploadWorkspaceFileAndLoad = async (path: RelativePath): Promise<LATER<'LoadImage'>> => {
        const upload = await this.uploadWorkspaceFile(path)
        const img = (this.graph as any).LoadImage({ image: upload.name })
        return img
    }

    uploadURL = async (url: string = RANDOM_IMAGE_URL): Promise<ComfyUploadImageResult> => {
        const blob = await this.workspace.getUrlAsBlob(url)
        const bytes = new Uint8Array(await blob.arrayBuffer())
        return this.uploadUIntArrToComfy(bytes)
    }

    private uploadUIntArrToComfy = async (bytes: Uint8Array): Promise<ComfyUploadImageResult> => {
        const uploadURL = this.workspace.getServerHostHTTP() + '/upload/image'
        const form = new FormData()
        form.append('image', Buffer.from(bytes), { filename: 'upload.png' })
        const resp = await fetch(uploadURL, { method: 'POST', headers: form.getHeaders(), body: form })
        const result: ComfyUploadImageResult = (await resp.json()) as any
        console.log({ 'resp.data': result })
        // this.lastUpload = new CushyImage(this, { filename: result.name, subfolder: '', type: 'output' }).url
        return result
    }

    // --------------------
    // INTERRACTIONS

    async PROMPT(): Promise<PromptExecution> {
        logger().info('prompt requested')
        const step = await this.sendPromp()
        // this.run.cyto.animate()
        await step.finished
        return step
    }

    private _promptCounter = 0
    private sendPromp = async (): Promise<PromptExecution> => {
        const currentJSON = deepCopyNaive(this.graph.jsonForPrompt)
        const schema = this.workspace.schema
        this.workspace.broadCastToAllClients({
            type: 'show-html',
            content: this.flowSummaryHTML,
            title: 'flow-summary',
        })
        this.workspace.broadCastToAllClients({ type: 'prompt', graph: currentJSON })

        logger().info('checkpoint:' + JSON.stringify(currentJSON))
        const step = new PromptExecution(this, currentJSON)
        this.steps.unshift(step)

        // if we're note really running prompts, just resolve the step and continue
        if (this.opts?.mock) {
            logger().info('MOCK => aborting')
            step._resolve!(step)
            return step
        }

        // 🔴 TODO: store the whole project in the prompt
        const out: ApiPromptInput = {
            client_id: this.workspace.comfySessionId,
            extra_data: { extra_pnginfo: { it: 'works' } },
            prompt: currentJSON,
        }

        // save a copy of the prompt to the cache folder
        const promptJSONPath = asAbsolutePath(path.join(this.outputAbsPath, `prompt-${++this._promptCounter}.json`))
        this.workspace.writeTextFile(promptJSONPath, JSON.stringify(currentJSON, null, 4))

        // save a corresponding workflow file
        const cytoJSONPath = asAbsolutePath(path.join(this.outputAbsPath, `cyto-${this._promptCounter}.json`))
        const cytoJSON = await runAutolayout(this.graph)
        this.workspace.writeTextFile(cytoJSONPath, JSON.stringify(cytoJSON, null, 4))

        // save a corresponding workflow file
        const workflowJSONPath = asAbsolutePath(path.join(this.outputAbsPath, `workflow-${this._promptCounter}.json`))
        const liteGraphJSON = convertFlowToLiteGraphJSON(this.graph, cytoJSON)
        this.workspace.writeTextFile(workflowJSONPath, JSON.stringify(liteGraphJSON, null, 4))

        // 🔶 not waiting here, because output comes back from somewhere else
        // TODO: but we may want to catch error here to fail early
        // otherwise, we might get stuck
        const promptEndpoint = `${this.workspace.getServerHostHTTP()}/prompt`
        logger().info('sending prompt to ' + promptEndpoint)
        const res = await fetch(promptEndpoint, {
            method: 'POST',
            body: JSON.stringify(out),
        })

        console.log('prompt status', res.status, res.statusText)
        // await sleep(1000)
        return step
    }

    constructor(
        //
        public workspace: ServerState,
        public fileAbsPath: AbsolutePath,
        public opts?: { mock?: boolean },
    ) {
        const relPath = asRelativePath(path.join('.cache', this.fileAbsPath))
        this.folder = this.workspace.resolve(relPath)
        this.nodes = new NodeBuilder(this)
        this.name = `Run-${this.createdAt}` // 'Run ' + this.script.runCounter++
        this.graph = new Graph(this.workspace.schema)
        // this.cyto = new Cyto(this.graph) // 🔴🔴
        makeAutoObservable(this)
    }

    steps: FlowExecutionStep[] = [new ScriptStep_Init()]

    /** current step */
    get step(): FlowExecutionStep {
        return this.steps[0]
    }

    /** outputs are both stored in ScriptStep_prompt, and on ScriptExecution */
    outputs: WsMsgExecuted[] = []

    // ctx = {}
}
