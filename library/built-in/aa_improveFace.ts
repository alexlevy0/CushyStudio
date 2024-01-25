import { run_improveFace_fromImage } from './_prefabs/prefab_detailer'

app({
    metadata: {
        name: 'improve face',
        description: 'improve face',
    },
    canStartFromImage: true,
    ui: (form) => ({
        prompt: form.prompt({}),
    }),
    run: async (run, ui, startImg) => {
        if (startImg == null) throw new Error('no image provided')
        run.workflow.builder.CheckpointLoaderSimple({ ckpt_name: 'revAnimated_v122.safetensors' })
        const img = await startImg.uploadAndloadAsImage()
        run_improveFace_fromImage(img)
        await run.PROMPT()
    },
})