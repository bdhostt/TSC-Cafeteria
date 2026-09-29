import mongoose, { Schema, Document } from "mongoose";
import dns from "dns";

// Only apply custom public DNS on local Windows machines where ISP DNS may block SRV records.
// On cloud Linux containers (like Render), native container DNS must be used first.
if (process.platform === "win32") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch (e) {
    // Ignore in environments where setServers is restricted
  }
}

export interface IRestaurantState extends Document {
  stateKey: string;
  data: Record<string, any>;
  timestamp: number;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantStateSchema = new Schema<IRestaurantState>(
  {
    stateKey: {
      type: String,
      required: true,
      unique: true,
      default: "default_cafe_banani",
      index: true
    },
    data: {
      type: Schema.Types.Mixed,
      required: true
    },
    timestamp: {
      type: Number,
      required: true,
      default: () => Date.now()
    }
  },
  {
    timestamps: true,
    minimize: false
  }
);

export const RestaurantStateModel: mongoose.Model<IRestaurantState> =
  (mongoose.models.RestaurantState as mongoose.Model<IRestaurantState>) ||
  mongoose.model<IRestaurantState>("RestaurantState", RestaurantStateSchema);

let isConnected = false;
let isConnecting = false;
let lastDbError: string | null = null;

export function getLastDbError(): string | null {
  return lastDbError;
}

export async function connectToDatabase(uri?: string): Promise<boolean> {
  const rawUri = uri || process.env.MONGODB_URI;
  const mongoUri = rawUri ? rawUri.replace(/\s+/g, "").trim() : "";

  if (!mongoUri) {
    lastDbError = "MONGODB_URI environment variable is empty or not configured.";
    console.log("ℹ️ MONGODB_URI not configured. Operating in fallback JSON-file storage mode.");
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  isConnecting = true;
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    lastDbError = null;
    console.log("✅ Successfully connected to MongoDB Database!");
    return true;
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    lastDbError = errMsg;
    console.warn("⚠️ MongoDB connection failed, falling back to local storage:", errMsg);

    // If SRV DNS lookup failed on Linux, try fallback public DNS once
    if (errMsg.includes("querySrv") || errMsg.includes("ENOTFOUND") || errMsg.includes("EAI_AGAIN")) {
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 45000,
        });
        isConnected = true;
        lastDbError = null;
        console.log("✅ Successfully connected to MongoDB Database via fallback DNS!");
        return true;
      } catch (retryErr: any) {
        lastDbError = retryErr?.message || String(retryErr);
      }
    }

    isConnected = false;
    return false;
  } finally {
    isConnecting = false;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
