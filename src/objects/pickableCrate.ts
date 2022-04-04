import { Mesh, PhysicsImpostor, Scene, SceneLoader, Vector3 } from "@babylonjs/core";

export class PickableCrate{

    private _scene: Scene;
    private _startingPosition: Vector3;

    constructor(scene, startingPosition){
        this._scene = scene;
        this._startingPosition = startingPosition;
    }

    public async load() {
        console.log("yes");
        let crateRoot = (await SceneLoader.ImportMeshAsync(null, "./models/", "wooden crate.glb", this._scene)).meshes[0];
        crateRoot.setAbsolutePosition(this._startingPosition);
        console.log(crateRoot);
        crateRoot.checkCollisions = true;
        //crateRoot.physicsImpostor =  new PhysicsImpostor(crateRoot, PhysicsImpostor.BoxImpostor, { mass: 10, restitution: 0.9 }, this._scene);
        crateRoot.receiveShadows = true;
        crateRoot.getChildMeshes().forEach(m=>{
            m.receiveShadows = true;
            m.checkCollisions = true;
        });
    }z

}