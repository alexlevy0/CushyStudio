import { observer } from 'mobx-react-lite'
import { InputNumberBase, Slider } from 'src/rsuite/shims'
import { parseFloatNoRoundingErr } from 'src/utils/misc/parseFloatNoRoundingErr'

export const InputNumberUI = observer(function InputNumberUI_(p: {
    val: number
    mode: 'int' | 'float'
    onValueChange: (next: number) => void
    step?: number
    min?: number
    max?: number
    hideSlider?: boolean
    style?: React.CSSProperties
    placeholder?: string
}) {
    const val = p.val
    const mode = p.mode
    const step = p.step ?? (mode === 'int' ? 1 : 0.1)
    const valueIsValid = typeof val === 'number' && !isNaN(val)
    return (
        <div tw='relative flex items-center'>
            {valueIsValid ? null : (
                <div className='text-red-500'>
                    Invalid value:
                    <pre>{JSON.stringify(val)}</pre>
                </div>
            )}
            {p.hideSlider ? null : (
                <Slider //
                    style={{ width: '6rem' }}
                    value={val}
                    min={p.min}
                    max={p.max}
                    step={step}
                    // handleStyle={{ height: '2rem' }}
                    onChange={(ev) => {
                        const next = ev.target.value
                        // parse value
                        let num =
                            typeof next === 'string' //
                                ? mode == 'int'
                                    ? parseInt(next, 10)
                                    : parseFloatNoRoundingErr(next, 2)
                                : next
                        // ensure is a number
                        if (isNaN(num) || typeof num != 'number') {
                            return console.log(`${JSON.stringify(next)} is not a number`)
                        }
                        // ensure ints are ints
                        if (mode == 'int') num = Math.round(num)
                        p.onValueChange(num)
                    }}
                />
            )}
            <InputNumberBase //
                tw='ml-4'
                value={val}
                placeholder={p.placeholder}
                style={{
                    fontFamily: 'monospace',
                    width: val.toString().length + 6 + 'ch',
                }}
                // min={req.input.min}
                // max={req.input.max}
                step={step}
                onChange={(ev) => {
                    const next = ev.target.value
                    // parse value
                    let num =
                        typeof next === 'string' //
                            ? mode == 'int'
                                ? parseInt(next, 10)
                                : parseFloat(next)
                            : next

                    // ensure is a number
                    if (isNaN(num) || typeof num != 'number') {
                        return console.log(`${JSON.stringify(next)} is not a number`)
                    }
                    // ensure ints are ints
                    if (mode == 'int') num = Math.round(num)
                    p.onValueChange(num)
                }}
            />
        </div>
    )
})
