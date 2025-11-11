import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  Ref,
} from 'react';

// Interface da prop esperada (só requer um id, pode ter outros campos)
interface ProductModel {
  id: number | string;
  [key: string]: any;
}

// Interface da ref exposta
export interface ProductImageUploaderHandle {
  enabled: () => void;
  disabled: () => void;
}

interface Props {
  productModel: ProductModel;
}

const ProductImageUploader = (
  { productModel }: Props,
  ref: Ref<ProductImageUploaderHandle>
) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => ({
    enabled: () => {
      setIsEnabled(true);
      setMessage(null);
      setStatus('idle');
    },
    disabled: () => {
      setIsEnabled(false);
      setMessage(null);
      setStatus('idle');
    },
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setStatus('idle');
    const files = e.target.files;
    if (!files || files.length === 0) {
      setPreviewUrl(null);
      return;
    }

    const file = files[0];
    // apenas preview local, upload será feito no clique do botão
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (err) {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    setMessage(null);

    if (!isEnabled) {
      setMessage('Upload está desabilitado.');
      setStatus('error');
      return;
    }

    if (!productModel || !productModel.id) {
      setMessage('Produto inválido: id ausente.');
      setStatus('error');
      return;
    }

    const input = fileInputRef.current;
    if (!input || !input.files || input.files.length === 0) {
      setMessage('Nenhum arquivo selecionado.');
      setStatus('error');
      return;
    }

    const file = input.files[0];

    const formData = new FormData();
    // campo 'image' (adapte se o backend esperar outro nome)
    formData.append('image', file);

    setStatus('loading');

    try {
      const resp = await fetch(`/api/products/${productModel.id}/image`, {
        method: 'POST',
        body: formData,
      });

      if (resp.ok) {
        setStatus('success');
        setMessage('Imagem enviada com sucesso.');
        // opcionalmente limpar input
        if (input) {
          input.value = '';
        }
        setPreviewUrl(null);
      } else {
        // tenta extrair mensagem do backend
        let text = await resp.text();
        try {
          const json = JSON.parse(text);
          text = json.message || text;
        } catch (e) {
          // não JSON
        }
        setStatus('error');
        setMessage(`Erro: ${text}`);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Erro ao enviar imagem.');
    }
  };

  const renderAlert = () => {
    if (!message) return null;
    const cls = status === 'success' ? 'alert-success' : 'alert-danger';
    return (
      <div className={`alert ${cls} mt-2`} role="alert">
        {message}
      </div>
    );
  };

  return (
    <div className="product-image-uploader">
      {!isEnabled && (
        <div className="alert alert-secondary" role="alert">
          Upload desabilitado
        </div>
      )}

      <div className="mb-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="form-control"
          onChange={handleFileChange}
          disabled={!isEnabled || status === 'loading'}
        />
      </div>

      {previewUrl && (
        <div className="mb-2">
          <img
            src={previewUrl}
            alt="preview"
            style={{ maxWidth: '200px', maxHeight: '200px' }}
            className="img-thumbnail"
          />
        </div>
      )}

      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!isEnabled || status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              Enviando...
            </>
          ) : (
            'Enviar imagem'
          )}
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => {
            setMessage(null);
            setStatus('idle');
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          disabled={status === 'loading'}
        >
          Limpar
        </button>
      </div>

      {renderAlert()}
    </div>
  );
};

export default forwardRef<ProductImageUploaderHandle, Props>(ProductImageUploader);
