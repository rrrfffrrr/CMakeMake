import { existsSync, readdirSync, statSync } from 'fs'
import glob from 'glob'
import pathModule from 'path'
import slashModule from 'slash'
import { CMake } from './cmake'

export const path = pathModule
export const slash = slashModule

export function include(cmake: CMake, file: string) {
    try {
        require(file).default(cmake)
    } catch (e) {
        console.error(e)
    }
}
export function iterateSubDirs (cmake: CMake, dir: string) {
    const files = readdirSync(dir, { encoding: 'utf8', recursive: false, withFileTypes: true })
    for(const file of files) {
        if (!file.isDirectory()) {
            continue
        }

        const build = slash(path.join(dir, file.name, 'build'))
        include(cmake, build)
    }
}
/**
 * Return paths of file
 * @param search Glob string to find
 */
export function findFiles(search: string): string[] {
    return glob.sync(slash(search))
}