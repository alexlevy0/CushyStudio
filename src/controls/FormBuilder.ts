import type { ComfySchemaL } from 'src/models/Schema'
import * as W from './Widget'
import { exhaust } from 'src/utils/misc/ComfyUtils'
import { makeAutoObservable } from 'mobx'
import { _FIX_INDENTATION } from '../utils/misc/_FIX_INDENTATION'
import { Widget_choices, Widget_choices_config } from './widgets2/WidgetChoices'
import { Widget_str, Widget_str_config } from './widgets2/WidgetString'

export class FormBuilder {
    /** (@internal) don't call this yourself */
    constructor(public schema: ComfySchemaL) {
        makeAutoObservable(this)
    }

    // string
    string    = (opts: Widget_str_config<{ optional: false }>) => new Widget_str(this, this.schema, opts) // prettier-ignore
    str       = (opts: Widget_str_config<{ optional: false }>) => new Widget_str(this, this.schema, opts) // prettier-ignore
    stringOpt = (opts: Widget_str_config<{ optional: true  }>) => new Widget_str(this, this.schema, opts) // prettier-ignore
    strOpt    = (opts: Widget_str_config<{ optional: true  }>) => new Widget_str(this, this.schema, opts) // prettier-ignore

    color = (opts: W.Widget_color_config) => new W.Widget_color(this, this.schema, opts)
    size = (opts: W.Widget_size_config) => new W.Widget_size(this, this.schema, opts)
    orbit = (opts: W.Widget_orbit_config) => new W.Widget_orbit(this, this.schema, opts)
    prompt = (opts: W.Widget_prompt_config) => new W.Widget_prompt(this, this.schema, opts)
    promptOpt = (opts: W.Widget_promptOpt_config) => new W.Widget_promptOpt(this, this.schema, opts)
    seed = (opts: W.Widget_seed_config) => new W.Widget_seed(this, this.schema, opts)
    int = (opts: W.Widget_int_config) => new W.Widget_int(this, this.schema, opts)
    intOpt = (opts: W.Widget_intOpt_config) => new W.Widget_intOpt(this, this.schema, opts)
    float = (opts: W.Widget_float_config) => new W.Widget_float(this, this.schema, opts)
    floatOpt = (opts: W.Widget_floatOpt_config) => new W.Widget_floatOpt(this, this.schema, opts)
    number = (opts: W.Widget_float_config) => new W.Widget_float(this, this.schema, opts)
    numberOpt = (opts: W.Widget_floatOpt_config) => new W.Widget_floatOpt(this, this.schema, opts)
    matrix = (opts: W.Widget_matrix_config) => new W.Widget_matrix(this, this.schema, opts)
    boolean = (opts: W.Widget_bool_config) => new W.Widget_bool(this, this.schema, opts)
    bool = (opts: W.Widget_bool_config) => new W.Widget_bool(this, this.schema, opts)
    inlineRun = (opts: W.Widget_inlineRun_config) => new W.Widget_inlineRun(this, this.schema, opts)
    loras = (opts: W.Widget_loras_config) => new W.Widget_loras(this, this.schema, opts)
    image = (opts: W.Widget_image_config) => new W.Widget_image(this, this.schema, opts)
    markdown = (opts: W.Widget_markdown_config | string) =>
        new W.Widget_markdown(this, this.schema, typeof opts === 'string' ? { markdown: opts } : opts)
    custom = <TViewState>(opts: W.Widget_custom_config<TViewState>) => new W.Widget_custom<TViewState>(this, this.schema, opts)
    imageOpt = (opts: W.Widget_imageOpt_config) => new W.Widget_imageOpt(this, this.schema, opts)
    enum = <const T extends KnownEnumNames>(p: W.Widget_enum_config<T>) => new W.Widget_enum(this, this.schema, p)
    enumOpt = <const T extends KnownEnumNames>(p: W.Widget_enumOpt_config<T>) => new W.Widget_enumOpt(this, this.schema, p)
    list = <const T extends W.Widget>(p: W.Widget_list_config<T>) => new W.Widget_list(this, this.schema, p)
    listExt = <const T extends W.Widget>(p: W.Widget_listExt_config<T>) => new W.Widget_listExt(this, this.schema, p)
    timeline = <const T extends W.Widget>(p: W.Widget_listExt_config<T>) =>
        new W.Widget_listExt(this, this.schema, { mode: 'timeline', ...p })
    regional = <const T extends W.Widget>(p: W.Widget_listExt_config<T>) =>
        new W.Widget_listExt(this, this.schema, { mode: 'regional', ...p })
    groupOpt = <const T extends { [key: string]: W.Widget }>(p: W.Widget_groupOpt_config<T>) =>
        new W.Widget_groupOpt(this, this.schema, p)
    group = <const T extends { [key: string]: W.Widget }>(p: W.Widget_group_config<T>) => new W.Widget_group(this, this.schema, p)

    // List API--------------
    selectOne = <const T extends W.BaseSelectEntry>(p: W.Widget_selectOne_config<T>) =>
        new W.Widget_selectOne(this, this.schema, p)
    selectMany = <const T extends W.BaseSelectEntry>(p: W.Widget_selectMany_config<T>) =>
        new W.Widget_selectMany(this, this.schema, p)

    // Object API-------------
    choice = <const T extends { [key: string]: () => W.Widget }>(p: Widget_choices_config<T>) =>
        new Widget_choices(this, this.schema, { ...p, multi: false })
    choices = <const T extends { [key: string]: () => W.Widget }>(p: Widget_choices_config<T>) =>
        new Widget_choices(this, this.schema, p)

    _FIX_INDENTATION = _FIX_INDENTATION

    /** (@internal); */
    _cache: { count: number } = { count: 0 }

    /** (@internal) will be set at builer creation, to allow for dyanmic recursive forms */
    _ROOT!: W.Widget_group<any>

    /** (@internal) advanced way to restore form state. used internally */
    _HYDRATE = (type: W.Widget['type'], input: any, serial?: any): any => {
        if (type === 'bool') return new W.Widget_bool(this, this.schema, input, serial)
        if (type === 'inlineRun') return new W.Widget_inlineRun(this, this.schema, input, serial)
        if (type === 'str') return new Widget_str(this, this.schema, input, serial)
        if (type === 'int') return new W.Widget_int(this, this.schema, input, serial)
        if (type === 'seed') return new W.Widget_seed(this, this.schema, input, serial)
        if (type === 'intOpt') return new W.Widget_intOpt(this, this.schema, input, serial)
        if (type === 'float') return new W.Widget_float(this, this.schema, input, serial)
        if (type === 'floatOpt') return new W.Widget_floatOpt(this, this.schema, input, serial)
        if (type === 'matrix') return new W.Widget_matrix(this, this.schema, input, serial)
        if (type === 'prompt') return new W.Widget_prompt(this, this.schema, input, serial)
        if (type === 'promptOpt') return new W.Widget_promptOpt(this, this.schema, input, serial)
        if (type === 'loras') return new W.Widget_loras(this, this.schema, input, serial)
        if (type === 'image') return new W.Widget_image(this, this.schema, input, serial)
        if (type === 'imageOpt') return new W.Widget_imageOpt(this, this.schema, input, serial)
        if (type === 'enum') return new W.Widget_enum(this, this.schema, input, serial)
        if (type === 'enumOpt') return new W.Widget_enumOpt(this, this.schema, input, serial)
        if (type === 'list') return new W.Widget_list(this, this.schema, input, serial)
        if (type === 'listExt') return new W.Widget_listExt(this, this.schema, input, serial)
        if (type === 'groupOpt') return new W.Widget_groupOpt(this, this.schema, input, serial)
        if (type === 'group') return new W.Widget_group(this, this.schema, input, serial)
        if (type === 'selectOne') return new W.Widget_selectOne(this, this.schema, input, serial)
        if (type === 'selectMany') return new W.Widget_selectMany(this, this.schema, input, serial)
        if (type === 'size') return new W.Widget_size(this, this.schema, input, serial)
        if (type === 'color') return new W.Widget_color(this, this.schema, input, serial)
        if (type === 'choices') return new Widget_choices(this, this.schema, input, serial)
        if (type === 'markdown') return new W.Widget_markdown(this, this.schema, input, serial)
        if (type === 'custom') return new W.Widget_custom(this, this.schema, input, serial)
        if (type === 'orbit') return new W.Widget_orbit(this, this.schema, input, serial)
        console.log(`🔴 unknown type ${type}`)
        exhaust(type)
    }
}
