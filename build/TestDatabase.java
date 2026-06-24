import java.io.FileInputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Properties;

public class TestDatabase {
    public static void main(String[] args) throws Exception {
        Properties props = new Properties();

        try (FileInputStream input = new FileInputStream("db.properties")) {
            props.load(input);
        }

        String driver = props.getProperty("database.driver");
        String url = props.getProperty("database.url");
        String user = props.getProperty("database.user");
        String password = props.getProperty("database.password");

        Class.forName(driver);

        try (
            Connection connection = DriverManager.getConnection(url, user, password);
            Statement statement = connection.createStatement();
            ResultSet result = statement.executeQuery(
                "SELECT DATABASE(), VERSION(), " +
                "(SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = DATABASE())"
            )
        ) {
            result.next();

            System.out.println("CONEXION_OK");
            System.out.println("Base: " + result.getString(1));
            System.out.println("MariaDB: " + result.getString(2));
            System.out.println("Tablas: " + result.getInt(3));
        }
    }
}
