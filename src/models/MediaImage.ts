import type { LiveInstance } from '../db/LiveInstance'

import { imageMeta, ImageMeta } from 'image-meta'
import { basename, join } from 'pathe'
import { LiveRefOpt } from 'src/db/LiveRefOpt'
import { MediaImageT } from 'src/db/TYPES.gen'
import { ComfyNodeJSON } from 'src/types/ComfyPrompt'
import { assets } from 'src/utils/assets/assets'
import { exhaust } from 'src/utils/misc/ComfyUtils'
import { ComfyImageInfo } from '../types/ComfyWsApi'
import { asAbsolutePath, asRelativePath } from '../utils/fs/pathUtils'
import { _readPngSize } from '../utils/png/_readPngSize'
import { ComfyPromptL } from './ComfyPrompt'
import { ComfyWorkflowL } from './Graph'
import { ComfyNodeMetadata } from 'src/types/ComfyNodeID'
import { ManualPromise } from 'src/utils/misc/ManualPromise'
import { SafetyResult } from 'src/safety/Safety'
import { readFileSync } from 'fs'

// prettier-ignore
export type ImageInfos =
    | ImageInfos_ComfyGenerated
    | ImageInfos_Local
    | ImageInfos_Base64

type ImageInfos_ComfyGenerated = {
    type: 'image-generated-by-comfy'
    comfyHostHttpURL: string
    comfyImageInfo: ComfyImageInfo
    /** present if the file has been cached locally */
    absPath?: string
}
type ImageInfos_Local = {
    type: 'image-local'
    absPath: AbsolutePath
}
type ImageInfos_Base64 = {
    type: 'image-base64'
    base64Url: string
}

const getComfyURLFromImageInfos = (infos: ImageInfos_ComfyGenerated) => {
    return infos.comfyHostHttpURL + '/view?' + new URLSearchParams(infos.comfyImageInfo).toString()
}

export const checkIfComfyImageExists = async (
    comfyHostHttpURL: string,
    imageInfo: { type: `input` | `ouput`; subfolder: string; filename: string },
) => {
    try {
        const url = getComfyURLFromImageInfos({
            type: `image-generated-by-comfy`,
            comfyHostHttpURL,
            comfyImageInfo: {
                ...imageInfo,
            },
        })
        console.log(`checkIfComfyImageExists`, { url })
        const result = await fetch(url, {
            method: `HEAD`,
        })
        console.log(`checkIfComfyImageExists result`, { url, result })

        return result.ok
    } catch {
        return false
    }
}

export interface MediaImageL extends LiveInstance<MediaImageT, MediaImageL> {}
export class MediaImageL {
    /** return the image filename */
    get filename() {
        const infos = this.data.infos
        if (infos == null) return 'null'
        if (infos.type === 'image-local') return basename(infos.absPath)
        if (infos.type === 'image-base64') return this.id
        if (infos.type === 'image-generated-by-comfy') return basename(infos.comfyImageInfo.filename)
        // if (infos.type === 'image-uploaded-to-comfy') return basename(infos.comfyUploadImageResult.name)
        // if (infos.type === 'video-local-ffmpeg') return basename(infos.absPath)
        exhaust(infos)
        return 'unknown'
    }

    /**
     * live reference to the prompt this image comes from
     * null if the image is not generated by comfy
     * @since v.2384
     */
    promptRef = new LiveRefOpt<this, ComfyPromptL>(this, 'promptID', () => this.db.comfy_prompts)

    /**
     * return the Comfy prompt instance from which this image was generated
     * null if the image is not generated by comfy
     * @since v.2384
     */
    get prompt(): Maybe<ComfyPromptL> {
        return this.promptRef.item
    }

    /**
     * return the workflow from which this image was generated
     * @since v.2384
     */
    get graph(): ComfyWorkflowL | undefined {
        return this.prompt?.graph
    }

    /** return the json of the ComfyNode that led to this image */
    get ComfyNode(): Maybe<ComfyNodeJSON> {
        const nodeID = this.data.promptNodeID
        if (nodeID == null) return null
        return this.graph?.data.comfyPromptJSON[nodeID]
    }

    openInImageEditor = () => {
        this.st.layout.FOCUS_OR_CREATE('Paint', { imgID: this.id })
    }

    /**
     * return the metadata of the ComfyNode that led to this image
     * null if not generated by comfy throu a CushyStudio prompt
     * null if no metadata associated in the node in CushyStudio
     */
    get ComfyNodeMetadta(): Maybe<ComfyNodeMetadata> {
        const nodeID = this.data.promptNodeID
        if (nodeID == null) return null
        return this.graph?.data.metadata[nodeID]
    }

    /**
     * return the base64 url for this file, regardless of it's exact representation
     * includes the prefix `data:image/png;base64,`
     */
    async getBase64Url(): Promise<string> {
        const infos = this.data.infos
        if (infos == null) return Promise.reject('can not extract base64 URL: no infos available')
        if (infos.type === 'image-base64') return infos.base64Url
        const bin = await this.getArrayBuffer()
        return `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(bin)))}`
    }

    /** return the ArrayBuffer for this file, regardless it's exact representation  */
    async getArrayBuffer(): Promise<ArrayBuffer> {
        const infos = this.data.infos
        // case 1. missing
        if (infos == null) return Promise.reject('failed to extract ArrayBuffer')

        // case 2. base64
        if (infos.type === 'image-base64') {
            const base64_string = infos.base64Url.replace('data:image/png;base64,', '')
            return Uint8Array.from(atob(base64_string), (c) => c.charCodeAt(0))
        }

        // case 3. comfy
        if (infos.type === 'image-generated-by-comfy') {
            const response = await fetch(this.url, {
                headers: { 'Content-Type': 'image/png' },
                method: 'GET',
            })
            const binArr = await response.arrayBuffer()
            return binArr
        }

        // case 4. local file
        if (infos.type === 'image-local') {
            const bin = readFileSync(infos.absPath)
            return bin
        }

        // or fail
        exhaust(infos)
        return Promise.reject('failed to extract ArrayBuffer')
    }

    /** ready to be used in image fields */
    get url() {
        const infos = this.data.infos
        if (infos == null) return `file://${assets.CushyLogo_png}`
        if (infos.type === 'image-local') return `file://${infos.absPath}`
        if (infos.type === 'image-base64') return infos.base64Url
        // if (infos.type === 'video-local-ffmpeg') return `file://${infos.absPath}`
        if (infos.type === 'image-generated-by-comfy') {
            return infos.absPath //
                ? `file://${infos.absPath}`
                : getComfyURLFromImageInfos(infos)
        }
        exhaust(infos)
        return `file://${assets.CushyLogo_png}`
    }

    /** absolute path on the machine running CushyStudio */
    get absPath(): Maybe<AbsolutePath> {
        const url = this.url
        if (url.startsWith('file://')) return asAbsolutePath(url.slice('file://'.length))
    }

    onCreate = (): void => {
        this.downloadImageAndSaveToDisk()
    }

    get isSafe(): ManualPromise<SafetyResult> {
        return this.st.safetyChecker.isSafe(this.url)
    }

    get existsLocally(): boolean {
        return this.absPath != null
    }

    getSize = async (): Promise<ImageMeta> => {
        if (this.data.width && this.data.height)
            return {
                width: this.data.width,
                height: this.data.height,
            }
        return this.updateImageMeta()
    }

    private updateImageMeta = async (buffer?: ArrayBuffer): Promise<ImageMeta> => {
        const buff = buffer ?? (await this.getArrayBuffer())
        const uint8arr = new Uint8Array(buff)
        const size = imageMeta(uint8arr)
        console.log(`[🏞️]`, size)
        this.update({ width: size?.width, height: size?.height })
        return size
    }

    private downloadImageAndSaveToDisk = async (): Promise<true> => {
        const infos = this.data.infos

        if (infos?.type !== 'image-generated-by-comfy') return true
        if (infos.absPath != null) return true

        // save image
        const outputRelPath = asRelativePath(join(infos.comfyImageInfo.subfolder, infos.comfyImageInfo.filename))
        const absPath = this.st.resolve(this.st.outputFolderPath, outputRelPath)
        const binArr = await this.getArrayBuffer()
        this.updateImageMeta(binArr)
        this.st.writeBinaryFile(absPath, Buffer.from(binArr))
        this.update({ infos: { ...infos, absPath: absPath } })
        console.info('🖼️ image saved')
        this._resolve(this)

        return true
    }

    // turns this into some clean abstraction
    _resolve!: (value: this) => void
    _rejects!: (reason: any) => void
    finished: Promise<this> = new Promise((resolve, rejects) => {
        this._resolve = resolve
        this._rejects = rejects
    })
}
