import React, { useState, useCallback } from 'react';
import type { ProductData, ImageFile } from './types';
import { generateProductContent } from './services/geminiService';
import Loader from './components/Loader';

// --- Helper Components (Defined outside App to prevent re-creation on re-renders) ---

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const CopyIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);


interface ImageUploaderProps {
  image: ImageFile | null;
  setImage: (image: ImageFile | null) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ image, setImage }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          setImage({
            base64: base64String,
            mimeType: file.type,
            name: file.name
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
     if (file && file.type.startsWith('image/')) {
       const reader = new FileReader();
       reader.onloadend = () => {
         const base64String = reader.result?.toString().split(',')[1];
         if (base64String) {
           setImage({
             base64: base64String,
             mimeType: file.type,
             name: file.name
           });
         }
       };
       reader.readAsDataURL(file);
     }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };


  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-2">تصویر محصول (اختیاری)</label>
      <label 
        htmlFor="file-upload" 
        className="relative cursor-pointer bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex flex-col justify-center items-center h-48 w-full hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {image ? (
          <>
            <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
            <button
              onClick={(e) => { e.preventDefault(); setImage(null); }}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 text-xs hover:bg-red-700 transition"
              aria-label="Remove image"
            >
              &#x2715;
            </button>
          </>
        ) : (
          <div className="text-center">
            <UploadIcon />
            <p className="mt-2 text-sm text-gray-400">تصویر را بکشید و رها کنید یا کلیک کنید</p>
            <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
          </div>
        )}
        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
      </label>
    </div>
  );
};

interface OutputSectionProps {
    label: string;
    content: React.ReactNode;
    isHtml?: boolean;
    copyText?: string;
    children?: React.ReactNode;
}

const OutputSection: React.FC<OutputSectionProps> = ({ label, content, isHtml = false, copyText, children }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const textToCopy = copyText || (typeof content === 'string' ? content : '');
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-blue-300">{label}</h3>
                <button
                    onClick={handleCopy}
                    className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-md transition-colors text-sm"
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    <span>{copied ? 'کپی شد!' : 'کپی'}</span>
                </button>
            </div>
            <div className="text-gray-300 whitespace-pre-wrap font-sans">
                {isHtml && typeof content === 'string' ? (
                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
                ) : (
                   content
                )}
            </div>
            {children}
        </div>
    );
};


// --- Main App Component ---

function App() {
  const [productName, setProductName] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [productImage, setProductImage] = useState<ImageFile | null>(null);
  const [generatedContent, setGeneratedContent] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!productName || !apiKey) {
      setError('لطفاً نام محصول و کلید API را وارد کنید.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setGeneratedContent(null);

    try {
      const content = await generateProductContent(productName, productImage, apiKey);
      setGeneratedContent(content);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("یک خطای ناشناخته رخ داد.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [productName, productImage, apiKey]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            Mohannad SEO
          </h1>
          <p className="mt-4 text-lg text-gray-400">
           دستیار هوشمند شما برای تولید و بهینه‌سازی محتوای محصول در وردپرس
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-200">۱. اطلاعات محصول را وارد کنید</h2>
            <div className="space-y-6">
               <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-2">
                  کلید API گوگل
                </label>
                <input
                  type="password"
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="کلید خود را اینجا وارد کنید"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="product-name" className="block text-sm font-medium text-gray-300 mb-2">نام محصول (یا یک توصیف کلی)</label>
                <input
                  type="text"
                  id="product-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="مثال: کافی میت نستله"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
              <ImageUploader image={productImage} setImage={setProductImage} />
              
              <button
                onClick={handleSubmit}
                disabled={isLoading || !productName || !apiKey}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? <Loader /> : '✨ تولید محتوای بهینه'}
              </button>
              {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-200">۲. محتوای تولید شده</h2>
            <div className="h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              {isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Loader />
                      <p className="mt-4 animate-pulse">در حال تولید محتوا طبق اصول Yoast SEO... این فرآیند ممکن است کمی طول بکشد.</p>
                  </div>
              )}
              {!isLoading && !generatedContent && (
                 <div className="flex items-center justify-center h-full text-gray-500">
                    <p>خروجی در اینجا نمایش داده می‌شود.</p>
                 </div>
              )}
              {generatedContent && (
                <div className="space-y-4">
                    {/* Corrected Product Name Row */}
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md animate-fade-in border border-teal-500/30">
                        <h3 className="font-bold text-lg text-teal-300 mb-3">🏷️ نام محصول شناسایی شده</h3>
                        <div className="space-y-3 text-gray-300">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-semibold text-gray-400 mb-1 sm:mb-0">نام فارسی (اصلاح شده):</span>
                                <code className="bg-gray-700 px-3 py-1 rounded-md text-teal-300 font-bold">{generatedContent.correctedProductName}</code>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-semibold text-gray-400 mb-1 sm:mb-0">نام انگلیسی:</span>
                                <code className="bg-gray-700 px-3 py-1 rounded-md text-teal-300 font-bold" dir="ltr">{generatedContent.englishProductName}</code>
                            </div>
                        </div>
                    </div>

                    <OutputSection label="توضیحات کامل محصول" content={generatedContent.fullDescription} isHtml={true} copyText={generatedContent.fullDescription} />
                    <OutputSection label="توضیحات کوتاه (Short Description)" content={generatedContent.shortDescription} />
                    <OutputSection label="کلیدواژه کانونی (Focus Keyphrase)" content={generatedContent.focusKeyword} />
                    <OutputSection label="عنوان سئو (SEO Title)" content={generatedContent.seoTitle} />
                    <OutputSection label="نامک (Slug)" content={generatedContent.slug} />
                    <OutputSection label="توضیحات متا (Meta Description)" content={generatedContent.metaDescription} />
                    
                    <OutputSection label="تجزیه و تحلیل سئو برتر (Advanced SEO Analysis)" content={null} copyText={generatedContent.keyphraseSynonyms.join(', ')}>
                        <div className="mt-2">
                            <span className="font-semibold text-gray-400">عبارات مترادف کلیدی: </span>
                            <p className="inline">{generatedContent.keyphraseSynonyms.join('، ')}</p>
                        </div>
                    </OutputSection>
                </div>
              )}
            </div>
          </div>
        </div>
        <footer className="text-center mt-10 text-gray-500 text-sm">
            <p>ساخته شده با 🧠 و ❤️ توسط Mohannad</p>
        </footer>
      </div>
       <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #2d3748; /* gray-800 */
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4a5568; /* gray-600 */
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #718096; /* gray-500 */
          }
          .prose strong {
            display: block;
            font-size: 1.1rem;
            font-weight: 700;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            color: #90cdf4; /* blue-300 */
          }
          .prose p, .prose ul {
            margin-bottom: 0.75rem;
          }
          .prose ul {
            padding-right: 1.5rem;
          }
           .prose li {
            margin-bottom: 0.25rem;
           }
           .prose hr {
            border-top-color: #4a5568; /* gray-600 */
            margin-top: 1.5rem;
            margin-bottom: 1.5rem;
           }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
      `}</style>
    </div>
  );
}

export default App;
