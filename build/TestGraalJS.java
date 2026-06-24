import javax.script.*;

public class TestGraalJS {
    public static void main(String[] args) throws Exception {
        ScriptEngine engine =
            new ScriptEngineManager().getEngineByName("graal.js");

        if (engine == null) {
            System.out.println("ERROR: graal.js no fue encontrado");
            System.exit(1);
        }

        Object result = engine.eval("1 + 2");
        System.out.println("Resultado JS: " + result);
        System.out.println("Motor operativo: " + result.toString().equals("3"));
    }
}
