import type { PromptExecution } from '../controls/ScriptStep_prompt'
import type { ComfyImageInfo } from '../types/ComfyWsApi'
import type { Maybe } from '../utils/types'
import type { ServerState } from './ServerState'

import fetch from 'node-fetch'
import * as path from 'path'
import { ImageInfos } from '../core/GeneratedImageSummary'
import { logger } from '../logger/logger'
import { AbsolutePath, RelativePath } from '../utils/fs/BrandedPaths'
import { asAbsolutePath, asRelativePath } from '../utils/fs/pathUtils'

enum ImageStatus {
    Known = 1,
    Downloading = 2,
    Saved = 3,
}
/** Cushy wrapper around ComfyImageInfo */
export class GeneratedImage implements ImageInfos {
    private static imageID = 1
    private workspace: ServerState

    /** 🔴 do not use */
    convertToImageInput = (): string => {
        return `../outputs/${this.data.filename}`
        // return this.LoadImage({ image: name })
    }

    /** unique image id */
    uid: string

    constructor(
        /** the prompt this file has been generated from */
        public prompt: PromptExecution,
        /** image info as returned by Comfy */
        public data: ComfyImageInfo, // public uid: string,
    ) {
        this.uid = `${this.prompt.name}_${GeneratedImage.imageID++}`
        this.workspace = prompt.workspace
        this.ready = this.downloadImageAndSaveToDisk()
    }

    // high level API ----------------------------------------------------------------------

    /** run an imagemagick convert action */
    imagemagicConvert = (partialCmd: string, suffix: string): string => {
        const pathA = this.localAbsolutePath
        const pathB = `${pathA}.${suffix}.png`
        const cmd = `convert "${pathA}" ${partialCmd} "${pathB}"`
        this.prompt.run.exec(cmd)
        return pathB
    }

    // COMFY RELATIVE ----------------------------------------------------------------------
    /** file name within the ComfyUI folder */
    get comfyFilename() {
        return this.data.filename
    }

    /** relative path on the comfy URL */
    get comfyRelativePath(): string {
        return `./outputs/${this.data.filename}`
    }

    /** url to acces the image */
    get comfyURL(): string {
        return this.workspace.getServerHostHTTP() + '/view?' + new URLSearchParams(this.data).toString()
    }

    // CONTENT ADRESS ----------------------------------------------------------------------

    /** short md5 hash of the image content
     * used to know if a ComfyUI server already has the image
     */
    get hash(): string {
        throw new Error('🔴 NOT IMPLEMENTED')
    }

    /** path within the input folder */
    comfyInputPath?: Maybe<string> = null

    /** 🔴 */
    uploadAsNamedInput = async (): Promise<string> => {
        const res = await this.prompt.run.uploadURL(this.comfyURL)
        console.log(`[makeAvailableAsInput]`, res)
        this.comfyInputPath = res.name
        return res.name
    }

    // CUSHY RELATIVE ----------------------------------------------------------------------
    /** local workspace file name, without extension */
    get localFileNameNoExt(): string {
        return this.prompt.uid + '_' + this.uid
    }

    /** local workspace file name, WITH extension */
    get localFileName(): string {
        return this.localFileNameNoExt + '.png'
    }

    /** absolute path on the machine with vscode */
    get localAbsolutePath(): AbsolutePath {
        return asAbsolutePath(path.join(this.workspace.cacheFolderPath, 'outputs', this.localFileName))
    }

    // .cushy/cache/Run-20230501220410/FaxYjyW1-fLr8ovwECJzZ_prompt-4_21.png
    // http://127.0.0.1:8388/Run-20230501220410/FaxYjyW1-fLr8ovwECJzZ_prompt-4_19.png
    get localURL(): string {
        return this.workspace.server.baseURL + this.localAbsolutePath.replace(this.workspace.cacheFolderPath, '')
    }

    toJSON = (): ImageInfos => {
        return {
            uid: this.uid,
            // comfy
            comfyURL: this.comfyURL,
            comfyRelativePath: this.comfyRelativePath,
            // local
            localURL: this.localURL,
            localAbsolutePath: this.localAbsolutePath,
        }
    }
    // MISC ----------------------------------------------------------------------
    /** true if file exists on disk; false otherwise */
    status: ImageStatus = ImageStatus.Known
    ready: Promise<true>

    /** @internal */
    private downloadImageAndSaveToDisk = async (): Promise<true> => {
        if (this.status !== ImageStatus.Known) throw new Error(`image status is ${this.status}`)
        this.status = ImageStatus.Downloading
        const response = await fetch(this.comfyURL, {
            headers: { 'Content-Type': 'image/png' },
            method: 'GET',
            // responseType: ResponseType.Binary,
        })
        const binArr = await response.buffer()
        // const binArr = new Uint16Array(numArr)

        this.workspace.writeBinaryFile(this.localAbsolutePath, binArr)
        logger().info('🖼️ image saved')
        this.status = ImageStatus.Saved
        return true
    }
}
