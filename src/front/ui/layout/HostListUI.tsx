import { observer } from 'mobx-react-lite'
import { Button, Panel } from 'rsuite'
import { useSt } from 'src/front/FrontStateCtx'

export const HostListUI = observer(function HostListUI_(p: {}) {
    const st = useSt()
    const mainComfyHost = st.configFile.value.comfyHost
    const mainComfyPort = st.configFile.value.comfyPort
    const machines = st.configFile.value.machines
    return (
        <div tw='flex flex-col gap-2 p-2'>
            {machines?.map((m, ix) => {
                const isMain = m.comfyHost === mainComfyHost && m.comfyPort === mainComfyPort
                return (
                    <Button
                        //
                        appearance={isMain ? 'primary' : 'ghost'}
                        color={isMain ? 'green' : 'blue'}
                        startIcon={<span className='material-symbols-outlined'>computer</span>}
                        onClick={() => {
                            st.configFile.update({
                                comfyHost: m.comfyHost,
                                comfyPort: m.comfyPort,
                            })
                        }}
                        key={ix}
                    >
                        <div className='flex gap-2'>
                            <div>
                                <div>
                                    {m.comfyHost}:{m.comfyPort}
                                </div>
                            </div>
                            {isMain ? <span className='material-symbols-outlined'>star</span> : null}
                        </div>
                    </Button>
                )
            })}
        </div>
    )
})