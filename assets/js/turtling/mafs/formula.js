export class  Formula {
    constructor(name, expression, args = []) {
        this.name = name;
        this.expression = expression;
        this.arg = args;
    }

    get arity() {
        return this.args.length;
    }
}
