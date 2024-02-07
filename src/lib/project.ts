import { readFileSync, writeFileSync } from "fs";
import path from "path";

export interface Project {
    project: string
    cache: string
}
export function loadProject(projectPath: string) {
    const data = readFileSync(path.join(projectPath, 'build.cache.json'), { encoding: 'utf8' })
    return JSON.parse(data) as Project
}
export function saveProject(projectName: string, projectPath: string, buildPath: string) {
    const project: Project = {
        project: projectName,
        cache: buildPath
    }
    writeFileSync(path.join(projectPath, 'build.cache.json'), JSON.stringify(project, null, 4), { encoding: 'utf8' })
}