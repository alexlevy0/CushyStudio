import type * as R from 'src/controls/Widget'

import { observer } from 'mobx-react-lite'

import { runInAction } from 'mobx'
import { ErrorBoundary } from 'react-error-boundary'
import { RevealUI } from 'src/rsuite/reveal/RevealUI'
import { Tooltip } from 'src/rsuite/shims'
import { useSt } from 'src/state/stateContext'
import { makeLabelFromFieldName } from '../../utils/misc/makeLabelFromFieldName'
import { ErrorBoundaryFallback } from '../../widgets/misc/ErrorBoundary'
import { InstallCustomNodeBtnUI } from '../../wiki/ui/InstallCustomNodeBtnUI'
import { InstallModelBtnUI } from '../misc/InstallModelBtnUI'
import { WidgetDI } from '../widgets/WidgetUI.DI'
import { ListControlsUI } from './ListControlsUI'
import { AnimatedSizeUI } from '../widgets/choices/AnimatedSizeUI'

export const WidgetWithLabelUI = observer(function WidgetWithLabelUI_(p: {
    widget: R.Widget
    rootKey: string
    // verticalLabels?: boolean
    isTopLevel?: boolean
}) {
    const { rootKey, widget } = p
    const KLS = WidgetDI
    const st = useSt()

    let tooltip: Maybe<string> = widget.config.tooltip
    let label: Maybe<string | false> = widget.config.label ?? makeLabelFromFieldName(rootKey)

    const isVertical = (() => {
        if (p.widget.config.showID) return true
        if (st.preferedFormLayout === 'auto') return p.widget.isVerticalByDefault
        if (st.preferedFormLayout === 'mobile') return true
        if (st.preferedFormLayout === 'dense') return false
    })()

    const isCollapsible = widget.isCollapsible
    const collapsed = widget.serial.collapsed && isCollapsible
    const levelClass = p.isTopLevel ? '_isTopLevel' : '_isNotTopLevel'
    if (widget instanceof KLS.Widget_group && Object.keys(widget.values).length === 0) return
    const toggleInfo =
        widget instanceof KLS.Widget_bool
            ? { value: widget.serial.active, toggle: () => runInAction(widget.toggle) }
            : widget instanceof KLS.Widget_optional
            ? { value: widget.serial.active, toggle: () => runInAction(widget.toggle) }
            : null

    const showToogle = toggleInfo != null // !widget.serial.active || widget instanceof KLS.Widget_bool //

    let widgetUI = collapsed ? null : (
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback} onReset={(details) => {}}>
            <WidgetDI.WidgetUI widget={widget} />
        </ErrorBoundary>
    )

    const isCollapsed = widget.serial.collapsed
    const isBoldTitle = p.isTopLevel || isVertical

    const showListControls = !isCollapsed && (widget instanceof KLS.Widget_listExt || widget instanceof KLS.Widget_list)
    const showFoldIndicator = /*!widget.serial.active ||*/ !widget.serial.collapsed && !widget.isCollapsible
    const showTooltip = tooltip != null
    const showLabel = label !== false
    // widget.type === 'group' ||
    // widget.type === 'group' ||
    // widget.type === 'list' ||
    // widget.type === 'choices'

    // const hasNoWidget = widgetUI == null

    const LABEL = (
        <div
            tw={[
                '_WidgetLabel',
                isVertical ? 'w-full' : null,
                widgetUI == null ? 'w-full' : null,
                'min-w-max shrink-0',
                'flex items-center gap-1 self-start',
                // 'hover:bg-base-200 cursor-pointer',
                'cursor-pointer',
            ]}
            onClick={() => {
                if (isCollapsed) return (widget.serial.collapsed = false)
                if (showToogle) return toggleInfo.toggle()
                // if (!widget.serial.active) return (widget.serial.active = true)
                // widget.serial.collapsed = true
            }}
        >
            {/* {widget.serial == null ? '🟢' : '🔴'} */}
            {/* {JSON.stringify(widget.serial)} */}
            {
                showToogle ? (
                    <div
                        style={{ width: '1.3rem', height: '1.3rem' }}
                        tw={[
                            toggleInfo.value ? 'bg-primary' : null,
                            //
                            'virtualBorder',
                            'rounded mr-1',
                            'cursor-pointer',
                        ]}
                        tabIndex={-1}
                        onClick={(ev) => {
                            ev.stopPropagation()
                            toggleInfo.toggle()
                        }}
                    >
                        {/* {widget.type} */}
                        {toggleInfo.value ? <span className='material-symbols-outlined text-primary-content'>check</span> : null}
                    </div>
                ) : null
                // <div
                //     style={{
                //         width: '1.3rem',
                //         height: '1.3rem',
                //         // background: 'oklch(var(--p)/.3)',
                //     }}
                //     // tw={[toggleInfo.value ? 'bg-primary' : null, 'virtualBorder', 'rounded mr-1']}
                //     tabIndex={-1}
                // >
                //     {/* <span className='material-symbols-outlined text-primary-content'>check</span> */}
                // </div>
            }

            {/* Label ------------------------------------ */}
            {showLabel && (
                <span
                    //
                    tw={[
                        //
                        'whitespace-nowrap',
                        'flex items-center',
                        isBoldTitle ? 'text-primary font-medium' : undefined,
                    ]}
                    style={
                        true && !isVertical //
                            ? { lineHeight: '2rem', display: 'inline-block' }
                            : { lineHeight: '2rem' }
                    }
                >
                    {label || '...'}
                    {widget.serial.collapsed ? <span className='material-symbols-outlined'>keyboard_arrow_right</span> : null}
                    {/* {widget.serial.collapsed ? '{...}' : null} */}
                    {p.widget.config.showID ? <span tw='opacity-50 italic text-sm'>#{p.widget.id.slice(0, 3)}</span> : null}
                </span>
            )}

            {/* Tooltip ------------------------------------ */}
            {showTooltip && (
                <RevealUI>
                    <div className='btn btn-sm btn-square btn-ghost'>
                        <span className='material-symbols-outlined'>info</span>
                    </div>
                    <Tooltip>{tooltip}</Tooltip>
                </RevealUI>
            )}

            {/* Install Models ------------------------------------ */}
            {p.widget.config.recommandedModels ? <InstallModelBtnUI models={p.widget.config.recommandedModels} /> : null}

            {/* Install Custom nodes ------------------------------------ */}
            {p.widget.config.customNodesByTitle ??
            p.widget.config.customNodesByURI ??
            p.widget.config.customNodesByNameInCushy ? (
                <InstallCustomNodeBtnUI recomandation={p.widget.config} />
            ) : null}

            {/* Spacer ------------------------------------ */}
            <div className='ml-auto flex items-center'>
                {showListControls ? <ListControlsUI widget={widget} /> : null}

                {/* Collapse ONLY Indicator ------------------------------------ */}
                {showFoldIndicator ? null : (
                    <span
                        tw={[
                            //
                            'opacity-30 hover:opacity-100 ml-auto btn btn-sm btn-ghost',
                            'btn-square',
                            // 'btn-narrow'
                            // 'btn-narrower'
                        ]}
                        onClick={(ev) => {
                            if (!widget.isCollapsible) return

                            ev.stopPropagation()
                            ev.preventDefault()

                            if (widget.serial.collapsed) {
                                widget.serial.collapsed = false
                            } else {
                                widget.serial.collapsed = true
                            }
                        }}
                    >
                        {widget.serial.collapsed ? (
                            <>
                                <span className='material-symbols-outlined'>keyboard_arrow_right</span>
                            </>
                        ) : widget.isCollapsible ? (
                            /*'▿'*/ <span className='material-symbols-outlined'>keyboard_arrow_down</span>
                        ) : null}
                    </span>
                )}
            </div>
        </div>
    )

    const labelGap = label == false ? '' : 'gap-1'
    const clsX = widget.serial.collapsed ? '_COLLAPSED' : ''
    // prettier-ignore
    let className = isVertical //
        ? `${clsX} __${widget.type} _WidgetWithLabelUI ${levelClass} flex flex-col items-baseline`
        : `${clsX} __${widget.type} _WidgetWithLabelUI ${levelClass} flex flex-row ${labelGap} ${isCollapsible ? 'items-baseline' : 'items-center'}` // prettier-ignore

    if (widgetUI == null) className += ' w-full'
    if (isVertical) {
        widgetUI = <div tw='w-full'>{widgetUI}</div>
    }
    return (
        <AnimatedSizeUI>
            <div tw={[isVertical ? '[padding-left:0.3rem] FIELD' : 'FIELDSimple']} className={className} key={rootKey}>
                {LABEL}
                {widgetUI}
            </div>
        </AnimatedSizeUI>
    )
    // }
})
