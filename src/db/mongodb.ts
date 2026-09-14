import mongoose, { Schema, Document } from "mongoose";
import dns from "dns";

// Ensure robust SRV DNS resolution across all local network providers / ISPs
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {
  // Ignore in environments where setServers is restricted
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

export async function connectToDatabase(uri?: string): Promise<boolean> {
  const mongoUri = uri || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log("ℹ️ MONGODB_URI not configured. Operating in fallback JSON-file storage mode.");
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("✅ Successfully connected to MongoDB Database!");
    return true;
  } catch (error: any) {
    console.warn("⚠️ MongoDB connection failed, falling back to local storage:", error?.message || error);
    isConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
