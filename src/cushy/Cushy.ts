import type { Maybe } from '../core/ComfyUtils'
import { AbsolutePath, RelativePath, asAbsolutePath, asRelativePath, pathe } from '../fs/pathUtils'

import { listen } from '@tauri-apps/api/event'
import * as dialog from '@tauri-apps/api/dialog'
import * as os from '@tauri-apps/api/os'
import * as path from '@tauri-apps/api/path'

import { makeAutoObservable } from 'mobx'
import { Workspace } from '../core/Workspace'
import { JsonFile } from '../monaco/JsonFile'
import { RootFolder } from '../fs/RootFolder'
import { toast } from 'react-toastify'
import { TauriDropEvent } from '../importers/tauriDropEvent'
import { readBinaryFile } from '@tauri-apps/api/fs'
import { ImportCandidate } from '../importers/ImportCandidate'
import { CushyGlobalRef } from './CushyGlobalRef'

export type UserConfigJSON = {
    version: 1
    theme?: 'dark' | 'light'
    recentProjects?: AbsolutePath[]
    reOpenLastProject?: boolean
}

/** global Singleton state for the application */
export class Cushy {
    static CREATE = async () => {
        const currentOS: os.Platform = await os.platform()
        const configDir: AbsolutePath = asAbsolutePath(await path.appConfigDir())
        return new Cushy(
            //
            currentOS,
            configDir,
        )
    }

    rootFolder: RootFolder
    userConfig: JsonFile<UserConfigJSON>

    readonly relativePathToGlobalConfig: RelativePath = asRelativePath('cushy-studio.json')

    get globalConfigAbsPath(): AbsolutePath {
        const final = pathe.join(this.rootFolder.absPath, this.relativePathToGlobalConfig)
        return asAbsolutePath(final)
    }

    private constructor(
        /** sync cached value so we don't have to do RPC with rust to find out */
        public os: os.Platform,
        /** sync cached value so we don't have to do RPC with rust to find out */
        public configDir: AbsolutePath,
    ) {
        this.rootFolder = new RootFolder(this.configDir)
        CushyGlobalRef.value = this
        this.userConfig = new JsonFile<UserConfigJSON>(this.rootFolder, {
            title: 'Global Config',
            relativePath: this.relativePathToGlobalConfig,
            init: (): UserConfigJSON => ({ version: 1, theme: 'dark', recentProjects: [] }),
            onReady: (data) => {
                console.log('[CUSHY] user config loaded:', data)
                console.log('[CUSHY] recent projects:', data.recentProjects)
                const lastProject = data.recentProjects?.[0]
                if (lastProject && this.userConfig.value.reOpenLastProject)
                    // if (lastProject === '/Users/loco/dev/CushyStudio/src/examples') {
                    // console.log('[CUSHY] [DEV] opening last recent project:', lastProject)
                    this.openWorkspace(lastProject)
            },
        })

        this.startListeningForFileDrop()
        makeAutoObservable(this)
    }

    isDraggigFile = false

    /** start listening for file drop events */
    startListeningForFileDrop = () => {
        // let pendingDrop = 0
        listen('tauri://file-drop-hover', () => {
            this.isDraggigFile = true
        })
        listen('tauri://file-drop-cancelled', () => {
            this.isDraggigFile = false
        })

        listen('tauri://file-drop', async (event_) => {
            // 2023-04-02 rvion:
            // | why does the doc examples include a sleep(100 ms) ?
            // | should I do the same => probably not needed 🤔
            // await new Promise((resolve) => setTimeout(resolve, 100))
            // pendingDrop++
            const event: TauriDropEvent = event_ as any
            // ensure a workspace is opened
            if (this.workspace == null) {
                toast('no workspace open; open a workspace first before importing a file', {
                    type: 'error',
                    position: 'bottom-right',
                })
                return
            }

            for (const filePath of event.payload) {
                const uint8Arr = await readBinaryFile(filePath)
                const file = new File([uint8Arr], filePath)
                this.workspace.importQueue.push(new ImportCandidate(this.workspace, file))
            }
            this.isDraggigFile = false
            console.log(event)
            // if (this.shadowRoot.querySelector('form:hover')) {
            //     console.log(event)
            // }
        })
    }

    /** currently opened workspace */
    workspace: Maybe<Workspace> = null

    closeWorkspace = async (): Promise<void> => {
        // 🔴 TODO: ensure we properly close all necessary sockets, etc, etc.
        this.workspace = null
    }

    /** prompt user to open a workspace */
    openWorkspaceDialog = async () => {
        const workspaceFolder = await dialog.open({
            title: 'Open',
            directory: true,
            filters: [
                //
                { name: 'Civitai Project', extensions: ['cushy'] },
                { name: 'image', extensions: ['png'] },
            ],
        })
        if (typeof workspaceFolder !== 'string') {
            return console.log('❌ not a string:', workspaceFolder)
        }
        const absolutePath = asAbsolutePath(workspaceFolder)
        this.openWorkspace(absolutePath)
    }

    openWorkspace = async (absoluteFolderPath: AbsolutePath): Promise<Workspace> => {
        // 1. open the workspace
        this.workspace = await Workspace.OPEN(this, absoluteFolderPath)

        // 3. bump workspace to the top of the recent projects list
        const prevRecentProjects: AbsolutePath[] = this.userConfig.value.recentProjects ?? []
        let nextRecentProjects: AbsolutePath[] = [
            absoluteFolderPath,
            ...prevRecentProjects.filter((p) => p !== absoluteFolderPath),
        ]
        if (nextRecentProjects.length > 10) nextRecentProjects = nextRecentProjects.slice(0, 10)
        this.userConfig.update({ recentProjects: nextRecentProjects })

        // 4. return the workspace
        return this.workspace
    }

    /** true when user config is ready */
    get ready(): boolean {
        return this.userConfig.ready
    }
}