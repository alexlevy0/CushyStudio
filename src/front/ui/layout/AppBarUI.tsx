import * as I from '@rsuite/icons'
import { observer } from 'mobx-react-lite'
import { Button, ButtonGroup, IconButton, InputGroup, SelectPicker } from 'rsuite'
import { useSt } from '../../FrontStateCtx'
import { SchemaIndicatorUI } from './SchemaIndicatorUI'
import { UpdateBtnUI } from './UpdateBtnUI'
import { WebsocketIndicatorUI } from './WebsocketIndicatorUI'

export const AppBarUI = observer(function AppBarUI_(p: {}) {
    const st = useSt()
    const themeIcon = st.theme.theme === 'light' ? 'highlight' : 'nights_stay'
    return (
        <div
            //
            id='CushyAppBar'
            className='flex gap-1 items-center'
            style={{ borderBottom: '1px solid #383838' }}
        >
            <div tw='whitespace-nowrap'>🛋️ CushyStudio</div>
            <Button
                appearance='subtle'
                loading={Boolean(st.db.saveTimeout)}
                size='sm'
                startIcon={<span className='material-symbols-outlined'>save</span>}
                onClick={() => st.db.markDirty()}
            >
                save
            </Button>
            <IconButton
                size='xs'
                icon={<span className='material-symbols-outlined'>{themeIcon}</span>}
                onClick={() => st.theme.toggle()}
            />
            <Button
                //
                size='sm'
                appearance='subtle'
                startIcon={<I.Reload />}
                onClick={() => window.location.reload()}
            >
                Reload
            </Button>

            {/* <IconButton
                size='sm'
                appearance='subtle'
                icon={st.cushyStatus?.connected ? <I.CheckRound color='green' /> : <I.ExpiredRound color='red' />}
            /> */}

            <UpdateBtnUI updater={st.updater} />
            <WebsocketIndicatorUI />
            <SchemaIndicatorUI />

            {/* <Button startIcon={<I.AddOutline />} size='sm' className='self-start' onClick={() => st.startProject()}>
                create project
            </Button> */}
            <div tw='flex items-center'>
                {/* layout:
                <div>
                    <SelectPicker
                        //

                        value={st.layout.currentPerspectiveName}
                        data={st.layout.allPerspectives}
                    />
                </div> */}
                <Button
                    size='xs'
                    appearance='primary'
                    color='red'
                    startIcon={<I.Reload />}
                    onClick={() => st.layout.resetCurrent()}
                >
                    Fix Layout
                </Button>
            </div>
            <div className='flex-grow'></div>
            <DBHealthUI />
            {/* <Button
                // startIcon={<I.AddOutline />}
                size='sm'
                appearance='subtle'
                className='self-start'
                endIcon={<span className='material-symbols-outlined'>open_in_new</span>}
                onClick={() => {
                    window.require('electron').shell.openExternal(st.getServerHostHTTP())
                }}
            >
                ComfyUI Web
            </Button> */}
            {/* biegert/ComfyUI-CLIPSeg */}

            <a
                className='ml-auto flex'
                onClick={(ev) => {
                    ev.preventDefault()
                    ev.stopPropagation()
                    window.require('electron').shell.openExternal('https://github.com/rvion/CushyStudio')
                }}
                href='#'
            >
                <span className='material-symbols-outlined text-yellow-600'>star</span>
                <span className='underline text-blue-300'>github.com/rvion/CushyStudio</span>
            </a>
        </div>
    )
})

export const DBHealthUI = observer(function DBHealthUI_(p: {}) {
    const st = useSt()
    const dbHealth = st.db.health
    const color = dbHealth.status === 'bad' ? 'red' : dbHealth.status === 'meh' ? 'yellow' : 'green'
    return (
        <div>
            <Button
                //
                size='sm'
                // appearance='subtle'
                color={color}
                onClick={() => st.db.reset()}
                startIcon={<span className='material-symbols-outlined'>power_settings_new</span>}
            >
                Reset DB ({dbHealth.sizeTxt})
            </Button>
        </div>
    )
})
