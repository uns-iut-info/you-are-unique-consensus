import { Scene, SceneLoader } from "@babylonjs/core";

export class PickableCrate{

    private _scene: Scene;

    constructor(scene, startingPosition){
        this._scene = scene;
    }

    public async load(){
        console.log("yes");
        let crateRoot = (await SceneLoader.ImportMeshAsync(null, "./models/", "wooden crate.glb", this._scene));
        crateRoot.meshes[0].checkCollisions = true;
        crateRoot.meshes[0].receiveShadows = true;
        crateRoot.meshes[0].getChildMeshes().forEach(m=>{
            m.receiveShadows = true;
            m.checkCollisions = true;
        });
    }

}