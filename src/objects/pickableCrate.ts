import { Scene, SceneLoader } from "@babylonjs/core";

export class PickableCrate{

    private _scene: Scene;

    constructor(scene, startingPosition){
        this._scene = scene;
    }

    public async load(){
        let crate = await SceneLoader.ImportMeshAsync(null, "./models/", "wooden crate.glb", this._scene);
        //crate.receiveShadows = true;
        //crate.checkCollisions = true;
    }

}