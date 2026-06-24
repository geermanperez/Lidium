import javax.script.*;

public class CheckEngines {
    public static void main(String[] args) {
        ScriptEngineManager manager = new ScriptEngineManager();

        if (manager.getEngineFactories().isEmpty()) {
            System.out.println("NINGUN_MOTOR_DISPONIBLE");
            return;
        }

        for (ScriptEngineFactory factory : manager.getEngineFactories()) {
            System.out.println(
                "Motor: " + factory.getEngineName() +
                " | Version: " + factory.getEngineVersion() +
                " | Nombres: " + factory.getNames()
            );
        }

        System.out.println(
            "graal.js disponible: " +
            (manager.getEngineByName("graal.js") != null)
        );
    }
}
