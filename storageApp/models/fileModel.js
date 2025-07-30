import { model, Schema } from 'mongoose';

const fileSchema = new Schema(
  {
    extension: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Directory',
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  { strict: 'throw', timestamps: true }
);

export const File = model('File', fileSchema);
