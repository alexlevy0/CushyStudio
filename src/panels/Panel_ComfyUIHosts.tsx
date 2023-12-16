import { runInAction } from 'mobx'
import { observer } from 'mobx-react-lite'
import { nanoid } from 'nanoid'
import { resolve } from 'path'
import { SQLITE_false, SQLITE_true } from 'src/db/SQLITE_boolean'
import { HostL } from 'src/models/Host'
import { SelectUI } from 'src/rsuite/SelectUI'
import { Joined, Panel, Toggle } from 'src/rsuite/shims'
import { useSt } from 'src/state/stateContext'
import { asAbsolutePath } from 'src/utils/fs/pathUtils'

export const LabelUI = observer(function LabelUI_(p: { children: React.ReactNode }) {
    return <div tw='whitespace-nowrap'>{p.children}: </div>
})

export const Panel_ComfyUIHosts = observer(function Panel_ComfyUIHosts_(p: { hostID?: HostID }) {
    const st = useSt()
    const allHosts = st.hosts.items
    const mainHost = st.mainHost

    return (
        <Panel tw='w-full h-full flex flex-col gap-2 p-2'>
            <div tw='flex flex-wrap gap-2'>
                <SelectUI<HostL>
                    label='Current Host'
                    options={allHosts}
                    value={() => mainHost}
                    onChange={null}
                    getLabelText={(h) => h.data.name || h.id}
                />
                <div
                    tw='btn-sm btn btn-outline'
                    onClick={() => {
                        st.configFile.update(() => {
                            st.db.hosts.create({
                                hostname: '192.168.1.19',
                                port: 8188,
                                name: '192.168.1.19',
                                isLocal: SQLITE_false,
                                useHttps: SQLITE_false,
                                absolutePathToComfyUI: asAbsolutePath(resolve('comfy')),
                                isVirtual: SQLITE_false,
                            })
                        })
                    }}
                >
                    Add (local network)
                </div>
                <div
                    tw='btn-sm btn btn-outline'
                    onClick={() => {
                        st.db.hosts.create({
                            name: `cloud_${nanoid()}`,
                            hostname: `...`,
                            port: 443,
                            isLocal: SQLITE_false,
                            useHttps: SQLITE_true,
                            absolutePathToComfyUI: asAbsolutePath(resolve('comfy')),
                            isVirtual: SQLITE_false,
                        })
                    }}
                >
                    Add (cloud)
                </div>
            </div>
            <div tw='flex flex-wrap gap-2'>
                {allHosts?.map((host) => {
                    return <HostUI key={host.id} host={host} />
                })}
            </div>
        </Panel>
    )
})

export const HostUI = observer(function MachineUI_(p: { host: HostL }) {
    const st = useSt()
    const config = st.configFile.value
    const host: HostL = p.host
    const isMain = host.id === config.mainComfyHostID

    return (
        <div
            tw={[
                //
                'virtualBorder',
                'p-2 bg-base-200 w-96 shadow-xl',
                isMain && 'bg-base-300',
            ]}
        >
            <div className='p-2 flex flex-col gap-1'>
                {/* SELECT BTN */}
                <Joined tw='flex gap-3'>
                    <div
                        tw={[
                            //
                            isMain ? 'btn-success' : 'btn-info btn-outline',
                            `btn btn-md flex-grow font-bold`,
                        ]}
                        onClick={() => st.configFile.update({ mainComfyHostID: host.id })}
                    >
                        {host.data.name ?? `${host.data.hostname}:${host.data.port}`}
                    </div>
                    <div
                        tw='btn'
                        onClick={() => {
                            runInAction(() => {
                                host.schema.delete()
                                host.delete()
                            })
                            // st.configFile.update(() => {
                            //     if (config.mainComfyHostID === host.id) config.mainComfyHostID = null
                            //     const index = config.comfyUIHosts?.indexOf(host)
                            //     if (index != null) config.comfyUIHosts?.splice(index, 1)
                            // })
                        }}
                    >
                        <span className='material-symbols-outlined'>delete_forever</span>
                    </div>
                </Joined>

                {/* NAME */}
                <div tw='flex gap-2'>
                    <LabelUI>name</LabelUI>
                    <input
                        tw='input input-bordered input-sm w-full'
                        onChange={(ev) => host.update({ name: ev.target.value })}
                        value={host.data.name ?? 'unnamed'}
                    ></input>
                </div>

                {/* HOST */}
                <div tw='flex items-center gap-1'>
                    <LabelUI>Host</LabelUI>
                    <input
                        tw='input input-bordered input-sm w-full' //
                        onChange={(ev) => host.update({ hostname: ev.target.value })}
                        value={host.data.hostname ?? ''}
                    ></input>
                </div>

                {/* PORT */}
                <div tw='flex items-center gap-1'>
                    <LabelUI>Port</LabelUI>
                    <input
                        tw='input input-bordered input-sm w-full' //
                        value={host.data.port ?? 8188}
                        onChange={(ev) => {
                            const next = ev.target.value
                            host.update({ port: parseInt(next, 10) })
                        }}
                    ></input>
                </div>

                {/* HTTPS */}
                <div tw='flex gap-2'>
                    <LabelUI>use HTTPS</LabelUI>
                    <Toggle //
                        checked={host.data.useHttps ? true : false}
                        onChange={(ev) => host.update({ useHttps: ev.target.checked ? SQLITE_true : SQLITE_false })}
                        name='useHttps'
                    />
                </div>

                {/* LOCAL PATH */}
                <div tw='flex items-center gap-1'>
                    <LabelUI>is local</LabelUI>
                    <Toggle
                        //
                        onChange={(ev) => host.update({ isLocal: ev.target.checked ? SQLITE_true : SQLITE_false })}
                        checked={host.data.isLocal ? true : false}
                    />
                </div>
                <div tw='flex flex-col'>
                    <LabelUI>absolute path to ComfyUI setup</LabelUI>
                    <input
                        tw='input input-bordered input-sm w-full'
                        type='string'
                        // placeholder='absolute path to ComfyUI install'
                        disabled={!Boolean(host.data.isLocal)}
                        onChange={(ev) => host.update({ absolutePathToComfyUI: ev.target.value })}
                        value={host.data.absolutePathToComfyUI ?? ''}
                    ></input>
                </div>
                <div tw='flex flex-col'>
                    <LabelUI>Absolute path to model folder</LabelUI>
                    <input
                        tw='input input-bordered input-sm w-full'
                        type='string'
                        disabled={!Boolean(host.data.isLocal)}
                        onChange={(ev) => host.update({ absolutePathToComfyUI: ev.target.value })}
                        value={host.data.absolutPathToDownloadModelsTo ?? ''}
                    ></input>
                </div>
                {/* ID */}
                {/* <div tw='flex gap-2'>
                    <LabelUI>id</LabelUI>
                    <input
                        tw='input input-bordered input-sm w-full'
                        onChange={(ev) => {
                            const next = ev.target.value
                            host.id = next as ComfyHostID
                        }}
                        value={host.id ?? 'unnamed'}
                    ></input>
                </div> */}
            </div>
        </div>
    )
})
