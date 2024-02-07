import { Library } from './library'

export const platforms = [ 'Win32', 'Win64' ] as const
export type platforms = typeof platforms[number]

export class Module {
    readonly name: string
    readonly packageName?: string
    readonly dependencies: string[] = []
    readonly platforms: {[key in platforms]?: Library[]} = {}

    constructor(name: string, packageName?: string) {
        this.name = name,
        this.packageName = packageName
        this.dependencies = []
        this.platforms = {}
    }

    get targetNames() {
        return Object.keys(this.platforms)
    }

    deps(...deps: string[]) {
        this.dependencies.push(...deps)
        return this
    }

    platform(platform: platforms, libaries: Library[]) {
        this.platforms[platform] = libaries
        return this
    }
}