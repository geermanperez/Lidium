/*
This file is part of the OdinMS Maple Story Server
Copyright (C) 2008 ~ 2010 Patrick Huy <patrick.huy@frz.cc> 
Matthias Butz <matze@odinms.de>
Jan Christian Meyer <vimes@odinms.de>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License version 3
as published by the Free Software Foundation. You may not use, modify
or distribute this program under any other version of the
GNU Affero General Public License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package constants;

public class ServerConstants {
//159.89.87.254 

    public static boolean TESPIA = false; // true = uses GMS test server, for MSEA it does nothing though
    /**
     * IPv4 announced to clients when they select or change channel.
     *
     * <p>Docker supplies this as {@code -Dlatinms.publicIp}. Keeping the
     * loopback default makes a local, non-Docker launch possible, while an
     * invalid production value fails during startup instead of redirecting
     * every player to an unusable address.</p>
     */
    public static final byte[] Gateway_IP = loadGatewayIp();
    //public static final byte[] Gateway_IP = new byte[]{(byte) 5, (byte) 180, (byte) 9, (byte) 16};
    //Inject a DLL that hooks SetupDiGetClassDevsExA and returns 0.

    private static byte[] loadGatewayIp() {
        final String configuredIp = System.getProperty("latinms.publicIp", "127.0.0.1").trim();
        final String[] octets = configuredIp.split("\\.", -1);
        if (octets.length != 4) {
            throw new IllegalStateException("latinms.publicIp debe ser una direccion IPv4: " + configuredIp);
        }

        final byte[] address = new byte[4];
        for (int i = 0; i < octets.length; i++) {
            try {
                final int value = Integer.parseInt(octets[i]);
                if (value < 0 || value > 255) {
                    throw new NumberFormatException();
                }
                address[i] = (byte) value;
            } catch (NumberFormatException ex) {
                throw new IllegalStateException("latinms.publicIp debe ser una direccion IPv4: " + configuredIp, ex);
            }
        }
        return address;
    }

    /*
     * Specifics which job gives an additional EXP to party
     * returns the percentage of EXP to increase
     */
    public static final byte Class_Bonus_EXP(final int job) {
        switch (job) {
            case 501, 530, 531, 532, 2300, 2310, 2311, 2312, 3100, 3110, 3111, 3112, 800, 900, 910 -> {
                return 10;
            }
        }
        return 0;
    }
    // Start of Poll
    public static final boolean PollEnabled = false;
    public static final String Poll_Question = "Are you mudkiz?";
    public static final String[] Poll_Answers = {"test1", "test2", "test3"};
    // End of Poll
    public static final short MAPLE_VERSION = (short) 111;
    public static final String MAPLE_PATCH = "1";
    public static boolean Use_Fixed_IV = true; // true = disable sniffing, false = server can connect to itself
    public static boolean Use_Localhost = false; // true = packets are logged, false = others can connect to server
    public static final int MIN_MTS = 100; //lowest amount an item can be, GMS = 110
    public static final int MTS_BASE = 0; //+amount to everything, GMS = 500, MSEA = 1000
    public static final int MTS_TAX = 5; //+% to everything, GMS = 10
    public static final int MTS_MESO = 10000; //mesos needed, GMS = 5000
    public static final String SQL_USER = "root", SQL_PASSWORD = "";
    //master login is only used in GMS: fake account for localhost only
    //master and master2 is to bypass all accounts passwords only if you are under the IPs below

    public static enum PlayerGMRank {

        NORMAL('@', 0),
        DONATOR('#', 1),
        SUPERDONATOR('$', 2),
        INTERN('%', 3),
        GM('!', 4),
        SUPERGM('!', 5),
        ADMIN('!', 6);
        private final char commandPrefix;
        private final int level;

        PlayerGMRank(char ch, int level) {
            commandPrefix = ch;
            this.level = level;
        }

        public char getCommandPrefix() {
            return commandPrefix;
        }

        public int getLevel() {
            return level;
        }
    }

    public static enum CommandType {

        NORMAL(0),
        TRADE(1);

        private final int level;

        CommandType(int level) {
            this.level = level;
        }

        public int getType() {
            return level;
        }
    }
}
