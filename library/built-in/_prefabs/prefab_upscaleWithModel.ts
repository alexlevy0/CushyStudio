import type { Runtime, Widget_enum, Widget_groupOpt } from 'src'
import type { FormBuilder } from 'src/controls/FormBuilder'
import type { OutputFor } from './_prefabs'
import type { ComfyWorkflowBuilder } from 'src/back/NodeBuilder'

export const ui_upscaleWithModel = (): Widget_groupOpt<{
    readonly model: Widget_enum<'Enum_UpscaleModelLoader_model_name'>
}> => {
    const form: FormBuilder = getCurrentForm()
    return form.groupOpt({
        items: () => ({
            model: form.enum({
                enumName: 'Enum_UpscaleModelLoader_model_name',
                default: '4x-UltraSharp.pth',
            }),
        }),
        recommandedModels: {
            knownModel: [
                // 2x
                'RealESRGAN x2',
                // 4x
                'RealESRGAN x4',
                '4x-UltraSharp',
                '4x-AnimeSharp',
                '4x_foolhardy_Remacri',
                '4x_NMKD-Siax_200k',
                // 8x
                '8x_NMKD-Superscale_150000_G',
            ],
        },
    })
}

export const run_upscaleWithModel = (ui: NonNullable<OutputFor<typeof ui_upscaleWithModel>>, p?: { image?: _IMAGE }): _IMAGE => {
    const run = getCurrentRun()
    const graph: ComfyWorkflowBuilder = run.nodes
    const upscale = ui
    const upscaleModelName = upscale.model
    const upscaleModel = graph.UpscaleModelLoader({ model_name: upscaleModelName })
    const upscaledResult = graph.ImageUpscaleWithModel({
        image: p?.image ?? run.AUTO,
        upscale_model: upscaleModel,
    })
    graph.SaveImage({ images: upscaledResult })
    return upscaledResult.outputs.IMAGE
}