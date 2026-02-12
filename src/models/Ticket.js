import mongoose from 'mongoose';

const { Schema } = mongoose;

const ticketSchema = new Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true,
    default: function () {
      // Generate EXP + 8 digit random number
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      return `EXP${randomNum}`;
    }
  },
  description: { type: String, trim: true },
  // Store notes as an array so multiple notes can be saved in DB
  notes: { type: [String], default: [] },
  attachments: { type: [String], default: [] },
  serialNumber: { type: String, trim: true },
  control: { type: String, trim: true },
  support_type: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'in_progress', 'closed', 'resolved', 'reopen'], default: 'pending' },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAgent: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment', default: null },
  isReadTicket: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true
});

ticketSchema.index({ createdAt: -1 });
// ticketNumber already has unique: true in schema, no need for separate index

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
export default Ticket;


