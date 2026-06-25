import { useState, FormEvent } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Undo2, 
  Sparkles,
  ClipboardList
} from 'lucide-react';

interface CustomerReviewPortalProps {
  orderNumber: string;
  customerName: string;
  mockupUrl: string;
  webhookUrl?: string;
}

export function CustomerReviewPortal({ 
  orderNumber, 
  customerName, 
  mockupUrl, 
  webhookUrl 
}: CustomerReviewPortalProps) {
  const [status, setStatus] = useState<'pending' | 'submitting' | 'approved' | 'revised' | 'error'>('pending');
  const [activeAction, setActiveAction] = useState<'none' | 'approve' | 'revise'>('none');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isTermsChecked, setIsTermsChecked] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleApprove = async () => {
    if (!isTermsChecked) return;
    
    setStatus('submitting');
    setApiError('');

    try {
      const payload = {
        orderNumber,
        customerName,
        action: 'approve',
        notes: 'Mockup approved for printing and shipment.',
        timestamp: new Date().toISOString()
      };

      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
      }

      setStatus('approved');
    } catch (err: any) {
      console.error('Approval webhook failed:', err);
      setApiError(err.message || 'Failed to submit response. Please try again.');
      setStatus('error');
    }
  };

  const handleRequestRevision = async (e: FormEvent) => {
    e.preventDefault();
    if (!revisionNotes.trim()) return;

    setStatus('submitting');
    setApiError('');

    try {
      const payload = {
        orderNumber,
        customerName,
        action: 'revise',
        notes: revisionNotes,
        timestamp: new Date().toISOString()
      };

      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
      }

      setStatus('revised');
    } catch (err: any) {
      console.error('Revision webhook failed:', err);
      setApiError(err.message || 'Failed to submit response. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#efeeed] py-16 px-6 sm:px-8 flex flex-col justify-center items-center font-sans">
      <div className="max-w-2xl w-full bg-white border border-[#e9e8e7] rounded-none p-8 sm:p-12 shadow-sm">
        
        {/* Brand Header */}
        <header className="text-center mb-10">
          <h1 className="text-lg sm:text-xl font-light tracking-[0.25em] text-[#1c1c1c] uppercase">
            Slate Elevation Studio
          </h1>
          <p className="text-[10px] sm:text-[11px] font-light tracking-widest text-gray-400 italic mt-1">
            every home has a story. frame yours.
          </p>
        </header>

        {/* Success / Status Screens */}
        {status === 'approved' && (
          <div className="text-center py-8 animate-fade-in">
            <span className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-50 text-emerald-600 mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </span>
            <h2 className="text-xl font-serif font-medium text-gray-900 mb-3">Order Approved</h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              Thank you, {customerName}! Your approval has been recorded for **Order #{orderNumber}**. We have released your custom framed home portrait to the printing workshop for final production. 
            </p>
            <p className="text-xs text-gray-400 mt-6 font-mono">
              You will receive a tracking number via email once your order ships.
            </p>
          </div>
        )}

        {status === 'revised' && (
          <div className="text-center py-8 animate-fade-in">
            <span className="inline-flex items-center justify-center p-3 rounded-full bg-amber-50 text-amber-600 mb-6">
              <Undo2 className="w-10 h-10" />
            </span>
            <h2 className="text-xl font-serif font-medium text-gray-900 mb-3">Revision Requested</h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              Your design feedback has been sent directly to the artist. We will review your comments, adjust the framing coordinates/text block layout, and email you a new mockup link within 1–2 business days.
            </p>
            <div className="bg-[#fcfbf9] border border-amber-100 rounded p-4 text-left text-xs text-amber-900 max-w-md mx-auto mt-6">
              <strong>Your revision request details:</strong>
              <p className="italic mt-1 text-gray-700">"{revisionNotes}"</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8 animate-fade-in">
            <span className="inline-flex items-center justify-center p-3 rounded-full bg-red-50 text-red-600 mb-6">
              <AlertCircle className="w-10 h-10" />
            </span>
            <h2 className="text-xl font-serif font-medium text-gray-900 mb-3">Submission Failed</h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto mb-6">
              We encountered an issue submitting your request ({apiError}). Please try again, or email us directly at **curator@slateelevationstudio.com** referencing **Order #{orderNumber}**.
            </p>
            <button
              onClick={() => setStatus('pending')}
              className="px-6 py-2.5 border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'submitting' && (
          <div className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400">
              Recording Curation Notes...
            </p>
          </div>
        )}

        {status === 'pending' && (
          <div className="animate-fade-in">
            {/* Matte Box Image frame preview */}
            <div className="relative bg-[#faf9f8] border border-gray-150 p-6 sm:p-8 mb-8 shadow-sm text-center">
              <div className="bg-white p-2 border border-gray-200 inline-block shadow-lg max-w-full">
                <img 
                  src={mockupUrl} 
                  alt="Your Custom Home Portrait Mockup" 
                  className="w-full h-auto max-h-[480px] object-contain"
                  onError={(e) => {
                    // Fallback to placeholder if mockup image is broken/invalid
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200';
                  }}
                />
              </div>
              <div className="text-center mt-5 text-[9px] font-mono text-gray-400 uppercase tracking-[0.2em]">
                Giclée Archival Print • Premium beveled Mat board • solid wood frame
              </div>
            </div>

            {/* Main Header / Details */}
            <div className="text-center mb-8">
              <h2 className="text-lg font-serif font-medium text-[#1c1c1c] mb-2">
                Review Your Layout Draft
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
                Welcome, **{customerName}**. Please verify the spelling of the street address, coordinates, and established date printed below your home drawing before authorizing shipment.
              </p>
            </div>

            {/* Actions Panel */}
            {activeAction === 'none' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setActiveAction('approve')}
                  className="flex-1 bg-[#1c1c1c] hover:bg-black text-white py-3.5 text-xs font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Approve & Print
                </button>
                <button
                  onClick={() => setActiveAction('revise')}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2"
                >
                  Request a Revision
                </button>
              </div>
            )}

            {/* Action: Approve Form */}
            {activeAction === 'approve' && (
              <div className="bg-[#faf9f8] border border-gray-200 p-6 animate-slide-down">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-1.5 font-sans">
                  Confirm Print Approval
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Upon approval, your mockup goes directly into our automatic workshop queue. It is mounted, matted, custom-framed, and shipped immediately. **No further changes can be made once submitted.**
                </p>
                
                <label className="flex items-start gap-3 cursor-pointer mb-6">
                  <input 
                    type="checkbox"
                    checked={isTermsChecked}
                    onChange={(e) => setIsTermsChecked(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[#1c1c1c] focus:ring-[#1c1c1c]"
                  />
                  <span className="text-[11px] text-gray-600 select-none">
                    I confirm that the text spelling, coordinates layout, and rendering style are correct and ready for print.
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={!isTermsChecked}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    Confirm & Send to Print
                  </button>
                  <button
                    onClick={() => {
                      setActiveAction('none');
                      setIsTermsChecked(false);
                    }}
                    className="px-4 py-3 border border-gray-300 text-gray-500 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action: Request Revision Form */}
            {activeAction === 'revise' && (
              <form onSubmit={handleRequestRevision} className="bg-[#faf9f8] border border-gray-200 p-6 animate-slide-down">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-1.5 font-sans">
                  Request Curation Revision
                </h3>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                  Provide notes detailing the changes you'd like (spelling, position, etc.). We offer one complimentary revision round.
                </p>

                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Please change the established year from EST. 2026 to EST. 2025, and shift the home drawing slightly up..."
                  required
                  rows={4}
                  className="w-full text-xs p-3 border border-gray-300 rounded focus:border-[#1c1c1c] focus:ring-1 focus:ring-[#1c1c1c] bg-white text-gray-800 placeholder-gray-400 mb-4"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    Submit Revision Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAction('none');
                      setRevisionNotes('');
                    }}
                    className="px-4 py-3 border border-gray-300 text-gray-500 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
