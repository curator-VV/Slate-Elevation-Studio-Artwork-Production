import { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  logout, 
  initAuth 
} from '../utils/firebaseAuth';
import { lookupAddressCoordinates } from '../utils/geminiApi';
import { 
  FileText, 
  RefreshCw, 
  UserCheck, 
  LogOut, 
  ArrowRight, 
  ExternalLink, 
  AlertCircle, 
  Sparkles, 
  SlidersHorizontal,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle
} from 'lucide-react';
import { Artwork, ArtworkStyle, FrameType, MatWidth, ArtworkDimensions, ArtworkStatus } from '../types';

interface GoogleFormsManagerProps {
  onImportArtwork: (artwork: Omit<Artwork, 'id' | 'referenceNumber' | 'lastModified'>) => void;
}

// Google Forms API Typings
interface FormItem {
  itemId: string;
  title?: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
    };
  };
}

interface FormMetadata {
  formId: string;
  info: {
    title: string;
    description?: string;
  };
  items?: FormItem[];
}

interface FormResponseAnswer {
  questionId: string;
  textAnswers: {
    answers: Array<{ value: string }>;
  };
}

interface FormResponseItem {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers?: {
    [questionId: string]: FormResponseAnswer;
  };
}

export function GoogleFormsManager({ onImportArtwork }: GoogleFormsManagerProps) {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google Form config state (loaded from local storage, fallback to the correct edit URL)
  const [formUrl, setFormUrl] = useState(() => 
    localStorage.getItem('slate_intake_form_url') || 
    'https://docs.google.com/forms/d/1y7t-rcwyizKFewg6TO3wG6a2ITGgSo3jJbwlA_n6mo/edit'
  );
  const [formMetadata, setFormMetadata] = useState<FormMetadata | null>(null);
  const [responses, setResponses] = useState<FormResponseItem[]>([]);
  
  // Save form URL to local storage when changed
  useEffect(() => {
    localStorage.setItem('slate_intake_form_url', formUrl);
  }, [formUrl]);
  
  // Custom expandable panels
  const [showMapping, setShowMapping] = useState(false);
  const [showFormHelp, setShowFormHelp] = useState(false);

  // Field mapping state: Maps artwork fields to Google Form questionIds
  const [mapping, setMapping] = useState<{
    clientName: string;
    title: string;
    style: string;
    frame: string;
    matWidth: string;
    dimensions: string;
    notes: string;
    address: string;
    cityState: string;
    estDate: string;
  }>({
    clientName: '',
    title: '',
    style: '',
    frame: '',
    matWidth: '',
    dimensions: '',
    notes: '',
    address: '',
    cityState: '',
    estDate: ''
  });

  // Track authentication state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync token and load initial data if authenticated
  useEffect(() => {
    if (accessToken) {
      handleSync();
    }
  }, [accessToken]);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setSuccessMsg('Google Workspace connection authorized successfully!');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to connect with Google Auth. Please ensure popups are enabled.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setFormMetadata(null);
    setResponses([]);
    setErrorMsg(null);
    setSuccessMsg('Disconnected from Google account.');
  };

  // Helper to extract Form ID from various formats
  const extractFormId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return '';

    // If it's already a clean alphanumeric ID, return it.
    // Clean form IDs are normally 44 characters or similar, e.g., 1D...
    // Note: viewform URLs has a different ID starting with 1FAIpQL...
    if (!trimmed.includes('/') && trimmed.length > 20) {
      return trimmed;
    }

    // Try to match public /viewform url form ID format
    const eRegex = /\/forms\/d\/e\/([A-Za-z0-9_-]+)/;
    const eMatch = trimmed.match(eRegex);
    if (eMatch && eMatch[1]) {
      return eMatch[1];
    }

    // Try to match edit url format
    const editRegex = /\/forms\/d\/([A-Za-z0-9_-]+)/;
    const editMatch = trimmed.match(editRegex);
    if (editMatch && editMatch[1]) {
      return editMatch[1];
    }

    return trimmed;
  };

  const handleSync = async () => {
    const id = extractFormId(formUrl);
    if (!id) {
      setErrorMsg('Please specify a valid Google Form ID or URL.');
      return;
    }

    if (!accessToken) {
      setErrorMsg('You must connect your Google Account first.');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Fetch Form Metadata to get questions list
      // GET https://forms.googleapis.com/v1/forms/{formId}
      const metaRes = await fetch(`https://forms.googleapis.com/v1/forms/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!metaRes.ok) {
        const errorData = await metaRes.json().catch(() => ({}));
        console.error('Meta fetch error details (JSON):', JSON.stringify(errorData, null, 2));
        
        let customMessage = `Google API returned status ${metaRes.status}. `;
        if (metaRes.status === 404) {
          customMessage += 'The form could not be found. If you provided the viewform link (starting with 1FAIpQL...), please note that Google Forms API often requires the EDITABLE form ID from the creator\'s browser address bar (a 44-character key starting with 1 when you are editing). See the instruction card below.';
        } else if (metaRes.status === 403) {
          customMessage += 'Permission Denied. Please ensure you are signed in with the Google account that owns or has permission to view this form, or that your form is not restricted by enterprise domain settings.';
        } else if (errorData.error?.message) {
          customMessage += errorData.error.message;
        }
        throw new Error(customMessage);
      }

      const metaData: FormMetadata = await metaRes.json();
      setFormMetadata(metaData);

      // Perform auto-mapping based on question text
      const questions = metaData.items?.filter(item => item.questionItem) || [];
      const newMapping = { ...mapping };

      questions.forEach(q => {
        const title = (q.title || '').toLowerCase();
        const qId = q.questionItem?.question.questionId || '';
        if (!qId) return;

        if (title.includes('name') || title.includes('client') || title.includes('customer') || title.includes('recipient')) {
          newMapping.clientName = qId;
        } else if (title.includes('title') || title.includes('subject') || title.includes('artwork')) {
          newMapping.title = qId;
        } else if (title.includes('style') || title.includes('treatment') || title.includes('medium')) {
          newMapping.style = qId;
        } else if (title.includes('frame') || title.includes('border') || title.includes('wood')) {
          newMapping.frame = qId;
        } else if (title.includes('mat') || title.includes('margin') || title.includes('mat width')) {
          newMapping.matWidth = qId;
        } else if (title.includes('dimension') || title.includes('size') || title.includes('width') || title.includes('height') || title.includes('size')) {
          newMapping.dimensions = qId;
        } else if (title.includes('address') || title.includes('street') || title.includes('house number')) {
          newMapping.address = qId;
        } else if (title.includes('city') || title.includes('state') || title.includes('location')) {
          newMapping.cityState = qId;
        } else if (title.includes('est') || title.includes('year') || title.includes('established') || title.includes('built')) {
          newMapping.estDate = qId;
        } else if (title.includes('note') || title.includes('remark') || title.includes('comment') || title.includes('request') || title.includes('spec')) {
          newMapping.notes = qId;
        }
      });

      // Fallbacks if no direct match found
      if (questions.length > 0) {
        if (!newMapping.clientName && questions[0]?.questionItem?.question.questionId) {
          newMapping.clientName = questions[0].questionItem.question.questionId;
        }
        if (!newMapping.title && questions[1]?.questionItem?.question.questionId) {
          newMapping.title = questions[1].questionItem.question.questionId;
        }
      }

      setMapping(newMapping);

      // 2. Fetch Form Responses
      // GET https://forms.googleapis.com/v1/forms/{formId}/responses
      const respRes = await fetch(`https://forms.googleapis.com/v1/forms/${id}/responses`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!respRes.ok) {
        const errorData = await respRes.json().catch(() => ({}));
        throw new Error(`Failed to load responses: ${errorData.error?.message || respRes.statusText}`);
      }

      const respData = await respRes.json();
      const loadedResponses: FormResponseItem[] = respData.responses || [];
      
      // Sort responses by submission time descending
      loadedResponses.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
      
      setResponses(loadedResponses);
      setSuccessMsg(`Synced successfully! Retrieved details for "${metaData.info.title}" with ${loadedResponses.length} submissions.`);
    } catch (err: any) {
      console.error('Google Forms sync failed:', err);
      setErrorMsg(err.message || 'Synchronization failed due to a network or credential issue.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Extract text answers for a given questionId in a response
  const getAnswerValue = (response: FormResponseItem, questionId: string): string => {
    if (!response.answers || !questionId) return '';
    const ansObj = response.answers[questionId];
    if (!ansObj || !ansObj.textAnswers || !ansObj.textAnswers.answers) return '';
    return ansObj.textAnswers.answers.map(a => a.value).join(', ');
  };

  const handleImportResponse = async (resp: FormResponseItem, index: number) => {
    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const rawStyle = getAnswerValue(resp, mapping.style);
      const rawFrame = getAnswerValue(resp, mapping.frame);
      const rawMat = getAnswerValue(resp, mapping.matWidth);
      const rawDim = getAnswerValue(resp, mapping.dimensions);

      // Standardize Style matching
      let style: ArtworkStyle = 'Watercolor';
      const styles: ArtworkStyle[] = ['Pencil Sketch', 'Watercolor', 'Charcoal Study', 'Architect Ink', 'Classic Oil', 'Digital Illustration'];
      const matchedStyle = styles.find(s => rawStyle.toLowerCase().includes(s.toLowerCase()));
      if (matchedStyle) style = matchedStyle;

      // Standardize Frame matching
      let frame: FrameType = 'None';
      const frames: FrameType[] = ['None', 'Natural Oak', 'Charcoal Black', 'Warm Walnut', 'Gallery Gold'];
      const matchedFrame = frames.find(f => rawFrame.toLowerCase().includes(f.toLowerCase()));
      if (matchedFrame) frame = matchedFrame;

      // Standardize Mat Board matching
      let matWidth: MatWidth = '2 inches'; // Default to 2 inches as per requirements
      const mats: MatWidth[] = ['None', '1 inch', '2 inches', '3 inches'];
      const matchedMat = mats.find(m => rawMat.toLowerCase().includes(m.toLowerCase()));
      if (matchedMat) matWidth = matchedMat;

      // Standardize Dimensions matching
      let dimensions: ArtworkDimensions = '24" x 36"'; // Default to 24" x 36" (landscape)
      const dims: ArtworkDimensions[] = ['8" x 10"', '11" x 14"', '16" x 20"', '24" x 36"'];
      const matchedDim = dims.find(d => rawDim.toLowerCase().includes(d.toLowerCase()));
      if (matchedDim) dimensions = matchedDim;

      // Use default portrait placeholders for files
      const intakePlaceholderImage = 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1200';

      const addressVal = getAnswerValue(resp, mapping.address);
      const cityStateVal = getAnswerValue(resp, mapping.cityState);
      const estDateVal = getAnswerValue(resp, mapping.estDate);

      // Fetch GPS coordinates in background
      let coordinates = '';
      const fullAddress = `${addressVal}, ${cityStateVal}`.trim().replace(/^,|,$/g, '').trim();
      if (fullAddress) {
        try {
          const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '') as string;
          coordinates = await lookupAddressCoordinates(fullAddress, apiKey);
        } catch (e) {
          console.warn('Could not auto-fetch coordinates on import:', e);
        }
      }

      onImportArtwork({
        clientName: getAnswerValue(resp, mapping.clientName) || 'Unspecified Client',
        title: getAnswerValue(resp, mapping.title) || `Portrait Request #${index + 1}`,
        style,
        frame,
        matWidth,
        dimensions,
        dateUploaded: new Date(resp.createTime).toISOString(),
        imageData: '', // Generated in workstation
        originalImage: intakePlaceholderImage, // original image placeholder (user can replace this)
        notes: getAnswerValue(resp, mapping.notes) || `Imported automatically from Google Form response [${resp.responseId}].`,
        status: 'Pending Review',
        address: addressVal,
        cityState: cityStateVal,
        coordinates: coordinates,
        estDate: estDateVal,
        imageScale: 1.15,
        sourceCropY: 50,
        processingMode: 'AI Generation',
        imageYOffset: 300,
        imageXOffset: 0,
        textYOffset: 5700
      });

      setSuccessMsg(`Imported Google Form Response #${index + 1} into Production desk roster!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to import response: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const googleFormItems = formMetadata?.items?.filter(item => item.questionItem) || [];

  return (
    <div className="space-y-6">
      {/* Intro Brand Block */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
              <Sparkles className="w-3 h-3 text-blue-600" /> API Synchronizer
            </span>
            <h2 className="text-xl font-extrabold text-gray-950 flex items-center gap-2">
              Google Forms Dispatch Desk
            </h2>
            <p className="text-xs text-gray-500 max-w-2xl">
              Connect client intake surveys directly to your plotter workstation. Access real-time submissions of raw specs and port them instantly to the local index pipeline.
            </p>
          </div>

          {!accessToken ? (
            <button
              onClick={handleLogin}
              disabled={isAuthLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-sans text-xs font-bold tracking-wide uppercase px-4 py-2.5 rounded-lg shadow-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              {isAuthLoading ? 'Connecting...' : 'Connect Google account'}
            </button>
          ) : (
            <div className="flex items-center gap-3 shrink-0 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              {user?.photoURL && (
                <img referrerPolicy="no-referrer" src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-full border border-gray-200" />
              )}
              <div className="text-left">
                <p className="text-[10px] font-bold text-gray-900 leading-none">{user?.displayName}</p>
                <p className="text-[10px] text-gray-400 leading-3">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Disconnect from Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Form Source Connection */}
        <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-9 space-y-1 text-left">
            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">
              Google Intake Form URL or editable Form Id
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="Paste public Google Form view / edit URL here..."
                disabled={isSyncing}
                className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-sans"
              />
              <a 
                href={formUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all bg-white shrink-0"
                title="Open client-facing Google Form in a new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="md:col-span-3">
            <button
              onClick={handleSync}
              disabled={isSyncing || !accessToken}
              className={`w-full text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
                isSyncing 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Retrieving API...' : 'Fetch Responses'}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-red-800 text-left">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Sync Error Checklist:</span>
              <p className="font-medium text-red-700 leading-normal">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-xs text-emerald-800 text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="font-semibold">{successMsg}</p>
          </div>
        )}
      </div>

      {/* Instructional Toggle Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <button 
          onClick={() => setShowFormHelp(!showFormHelp)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-extrabold text-gray-700 uppercase tracking-tight">Need help connecting? Creator vs. View Links Guide</span>
          </div>
          {showFormHelp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showFormHelp && (
          <div className="p-6 border-t border-gray-100 bg-amber-50/20 text-xs text-gray-600 space-y-4 text-left leading-relaxed">
            <p>
              By default, the URL you copy from your browser's sharing dashboard is a <strong>Public View/Submit</strong> URL (which contains <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">/forms/d/e/1FAIpQL.../viewform</code>). 
            </p>
            <div className="space-y-2">
              <h4 className="font-extrabold text-gray-800 uppercase text-[10px]">How Google Forms API Identifiers Work:</h4>
              <ul className="list-decimal pl-4 space-y-1.5">
                <li>
                  <strong>Permissions:</strong> The Google account connected in the top-right <strong>must</strong> be the owner or authorized editor of the form to view responses via the SECURE forms API.
                </li>
                <li>
                  <strong>Editable ID Method:</strong> If fetching fails with a <code className="text-red-700">404</code> using the view link, open your Form editor. Copy the 44-character alphanumeric key displayed in your address bar (it sits after <code className="bg-gray-100 text-gray-800 font-mono px-1">/d/</code> and before <code className="bg-gray-100 text-gray-800 font-mono px-1">/edit</code>).
                  <div className="mt-1">
                    Example address: <code className="bg-gray-100 text-gray-800 font-mono text-[10px] px-1">https://docs.google.com/forms/d/&lt;COPY_THIS_44_CHAR_KEY&gt;/edit</code>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Split mapping configuration & results Feed */}
      {formMetadata && (
        <div className="space-y-6">
          {/* Mapping Controls Expandable */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
            <button 
              onClick={() => setShowMapping(!showMapping)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-2 font-sans font-bold text-xs uppercase tracking-tight text-gray-700">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Adjust Questionnaire Fields Mapping ({googleFormItems.length} questions detected)</span>
              </div>
              {showMapping ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showMapping && (
              <div className="p-6 border-t border-gray-100 bg-gray-50/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
                {/* Client Name Mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Client / Recipient</label>
                  <select 
                    value={mapping.clientName} 
                    onChange={(e) => setMapping(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Portrait Title Mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Artwork Title</label>
                  <select 
                    value={mapping.title} 
                    onChange={(e) => setMapping(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Treatment Style Mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Treatment Style</label>
                  <select 
                    value={mapping.style} 
                    onChange={(e) => setMapping(prev => ({ ...prev, style: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Molding Frame mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Frame Type</label>
                  <select 
                    value={mapping.frame} 
                    onChange={(e) => setMapping(prev => ({ ...prev, frame: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Mat margins mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Mat Board Margin</label>
                  <select 
                    value={mapping.matWidth} 
                    onChange={(e) => setMapping(prev => ({ ...prev, matWidth: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Dimensions mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Printed Dimensions</label>
                  <select 
                    value={mapping.dimensions} 
                    onChange={(e) => setMapping(prev => ({ ...prev, dimensions: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Street Address mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Street Address</label>
                  <select 
                    value={mapping.address} 
                    onChange={(e) => setMapping(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* City, State mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">City, State</label>
                  <select 
                    value={mapping.cityState} 
                    onChange={(e) => setMapping(prev => ({ ...prev, cityState: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Established Date mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Est. Year / Line 3</label>
                  <select 
                    value={mapping.estDate} 
                    onChange={(e) => setMapping(prev => ({ ...prev, estDate: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>

                {/* Production Notes mapping */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-gray-500">Production notes</label>
                  <select 
                    value={mapping.notes} 
                    onChange={(e) => setMapping(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 font-medium focus:outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {googleFormItems.map(item => (
                      <option key={item.itemId} value={item.questionItem?.question.questionId}>{item.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Submissions Responses List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase text-left flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Raw Portal Intake queue ({responses.length} Submissions)
            </h3>

            {responses.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
                <FileText className="w-8 h-8 text-gray-300 animate-pulse" />
                <p className="text-sm font-sans font-extrabold text-gray-900">No Responses Found</p>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  The Google Form loaded successfully but doesn't have any submission records. Submissions will appear live as soon as clients submit the intake.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {responses.map((resp, idx) => {
                  const clientVal = getAnswerValue(resp, mapping.clientName);
                  const titleVal = getAnswerValue(resp, mapping.title);
                  const styleVal = getAnswerValue(resp, mapping.style);
                  const frameVal = getAnswerValue(resp, mapping.frame);
                  const matVal = getAnswerValue(resp, mapping.matWidth);
                  const dimVal = getAnswerValue(resp, mapping.dimensions);
                  const notesVal = getAnswerValue(resp, mapping.notes);

                  return (
                    <div 
                      key={resp.responseId}
                      className="bg-white border border-gray-200 hover:border-blue-200 rounded-lg p-5 flex flex-col justify-between shadow-3xs hover:shadow-2xs transition-all text-left space-y-4"
                    >
                      <div className="space-y-2">
                        {/* Header Details */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                            Submission #{responses.length - idx}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {new Date(resp.createTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        {/* Answers Breakdown Grid */}
                        <div className="space-y-1.5 text-xs">
                          {clientVal && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Client:</span>
                              <span className="font-bold text-gray-900 truncate">{clientVal}</span>
                            </div>
                          )}
                          {titleVal && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Title:</span>
                              <span className="text-gray-800 italic font-medium truncate">"{titleVal}"</span>
                            </div>
                          )}
                          {styleVal && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Treatment:</span>
                              <span className="text-gray-700 truncate font-semibold bg-blue-50/50 text-blue-800 px-1.5 py-0.25 rounded border border-blue-100/50">{styleVal}</span>
                            </div>
                          )}
                          {frameVal && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Frame:</span>
                              <span className="text-gray-700 truncate">{frameVal}</span>
                            </div>
                          )}
                          {matVal && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Mat Width:</span>
                              <span className="text-gray-700 truncate">{matVal}</span>
                            </div>
                          )}
                          {dimVal && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Dimensions:</span>
                              <span className="text-gray-700 truncate">{dimVal}</span>
                            </div>
                          )}
                          {getAnswerValue(resp, mapping.address) && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Address:</span>
                              <span className="text-gray-700 truncate">{getAnswerValue(resp, mapping.address)}</span>
                            </div>
                          )}
                          {getAnswerValue(resp, mapping.cityState) && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">City/State:</span>
                              <span className="text-gray-700 truncate">{getAnswerValue(resp, mapping.cityState)}</span>
                            </div>
                          )}
                          {getAnswerValue(resp, mapping.estDate) && (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] text-gray-450 uppercase font-extrabold w-20 shrink-0">Est. Year:</span>
                              <span className="text-gray-700 truncate">{getAnswerValue(resp, mapping.estDate)}</span>
                            </div>
                          )}
                          {notesVal && (
                            <div className="pt-2 border-t border-gray-100 flex flex-col gap-0.5">
                              <span className="text-[9px] text-gray-450 uppercase font-extrabold">Production Instruction:</span>
                              <p className="text-gray-500 italic text-[11px] line-clamp-2 leading-normal">{notesVal}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action trigger to port into Roster */}
                      <button
                        onClick={() => handleImportResponse(resp, responses.length - idx - 1)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-sans text-[11px] font-bold tracking-wide uppercase py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        Port to Production Desk
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded Client-Facing Form Frame preview */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs text-left">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-tight">Active Client-Facing Intake Mirror</h3>
            <p className="text-[10px] text-gray-400">Live embedded mock view of the Google Form. Share this with clients to collect portrait specifications.</p>
          </div>
          <span className="text-[10px] bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-mono font-bold uppercase px-2 py-0.5 rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live preview
          </span>
        </div>
        <div className="bg-gray-100 flex items-center justify-center relative min-h-[400px]">
          <iframe 
            src={`https://docs.google.com/forms/d/e/1FAIpQLSfZVXZNS4nVPhaMX-zkHLo2yUtBDO7v1JYUVMvO4-b-pd0BDQ/viewform?embedded=true`} 
            width="100%" 
            height="550" 
            itemID="google-form-iframe"
            className="border-0 w-full"
            title="Intake Google Form Interactive Frame"
          >
            Loading form...
          </iframe>
        </div>
      </div>
    </div>
  );
}
