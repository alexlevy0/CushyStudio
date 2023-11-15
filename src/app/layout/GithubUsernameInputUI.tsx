import { observer } from 'mobx-react-lite'
import { ReactNode } from 'react'
import { Input, InputGroup, InputGroupAddon, Popover, Tag, Whisper } from 'src/rsuite/shims'
import { assets } from 'src/utils/assets/assets'
import { useSt } from '../../state/stateContext'

export type RsuiteSize = 'lg' | 'md' | 'sm' | 'xs'
export const GithubUsernameInputUI = observer(function GithubUsernameInputUI_(p: {
    //
    children?: ReactNode
}) {
    const st = useSt()
    const githubUsername = st.configFile.value.githubUsername || '<your-github-username>'
    return (
        <InputGroup tw='w-auto'>
            <InputGroupAddon>
                <img src={assets.public_GithubLogo2_png} alt='Github Logo' style={{ width: '1.4rem', height: '1.4rem' }} />
                <Whisper
                    //
                    enterable
                    placement='bottomStart'
                    speaker={
                        <Popover>
                            <div>
                                Only folders in
                                <Tag>library/{githubUsername}/</Tag>
                                will have type-checking in your vscode
                            </div>
                        </Popover>
                    }
                >
                    <div>your github:</div>
                </Whisper>
            </InputGroupAddon>
            <Input
                onChange={(ev) => {
                    st.configFile.update({ githubUsername: ev.target.value })
                    st.updateTsConfig()
                }}
                value={githubUsername}
                // tw='font-mono'
                // style={{ width: `${githubUsername.length + 4}ch` }}
                placeholder='your github username'
            ></Input>
        </InputGroup>
    )
})
