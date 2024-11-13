'use client'

import { useState, useEffect } from 'react'
import { area, sector } from '@/lib/select'
import { columns } from '@/lib/subject'

export default function HomePage() {
  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [loading3, setLoading3] = useState(false)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])
  const [result, setResult] = useState<Array<{ name: string; notice: string | null }>>([])
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)

  const [selectedArea, setSelectedArea] = useState(area[0].index); // 初期値を設定
  const [selectedSector, setSelectedSector] = useState(sector[0].index); // 初期値を設定

  const handleRunScript = async () => {
    setLoading1(true)
    try {
      const response = await fetch('/api/walk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startA: selectedArea,
          startS: selectedSector,
        }),
      });
      if (response.ok) {
        alert('Script executed successfully')
      } else {
        alert('Failed to execute script')
      }
    } catch (error) {
      console.error('Error executing script:', error)
      alert('Error executing script')
    } finally {
      setLoading1(false)
    }
  }

  const handleSearch = async () => {
    setLoading2(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          areas: selectedAreas,
          sectors: selectedSectors,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // 仮のお知らせデータを追加（実際の実装ではAPIからのレスポンスを使用）
        const resultWithNotices = data.result.map((companyName: string) => ({
          name: companyName,
          notice: Math.random() > 0.8 ? 'お問合せページが不明です' : null
        }))
        setResult(resultWithNotices)
        alert('検索が完了しました')
      } else {
        alert('検索に失敗しました')
      }
    } catch (error) {
      console.error('Error executing script:', error)
      alert('検索中にエラーが発生しました')
    } finally {
      setLoading2(false)
    }
  }

  async function fetchCompanyInfo(companyName: string) {
    try {
      const response = await fetch('/api/infoGet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName }),
      });
  
      if (!response.ok) {
        throw new Error('会社情報の取得に失敗しました');
      }
  
      const data = await response.json();
      
      return data.result as columns;
      
    } catch (error) {
      console.error('APIコール中にエラーが発生しました:', error);
      throw error;
    }
  }
  
  // ポップアップコンポーネント
  function CompanyInfoPopup({ companyName, onClose }: { companyName: string; onClose: () => void }) {
    const [companyInfo, setCompanyInfo] = useState<any>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedInfo, setEditedInfo] = useState<any>(null)
    const [generatedContent, setGeneratedContent] = useState<string>('')

    useEffect(() => {
      fetchCompanyInfo(companyName).then(info => {
        setCompanyInfo(info)
        setEditedInfo(info)
      })
    }, [companyName])

    const handleEdit = () => {
      setIsEditing(true)
    }

    const handleSave = async () => {
      try {
        const response = await fetch('/api/infoUpdate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editedInfo),
        })

        if (response.ok) {
          setCompanyInfo(editedInfo)
          setIsEditing(false)
          alert('情報が更新されました')
        } else {
          alert('情報の更新に失敗しました')
        }
      } catch (error) {
        console.error('Error updating company info:', error)
        alert('情報の更新中にエラーが発生しました')
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setEditedInfo({
        ...editedInfo,
        [e.target.name]: e.target.value
      })
    }

    const handleGenerate = async () => {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ companyName }),
        });
    
        if (!response.ok) {
          throw new Error('生成情報の取得に失敗しました');
        }

        const data = await response.json();
        setGeneratedContent(data.result);

      } catch (error) {
        console.error('APIコール中にエラーが発生しました:', error);
        alert('AI生成中にエラーが発生しました');
      }
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-[90vw] max-w-6xl h-[90vh] flex">
          {/* Left Panel: Company Information */}
          <div className="w-1/2 pr-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{companyName}</h2>
            {companyInfo ? (
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: '産業分類', key: 'Industry' },
                  { label: '所在地', key: 'CompanyAddress' },
                  { label: 'ホームページ', key: 'HomePage', isLink: true },
                  { label: 'コンタクトページ', key: 'ContactPage', isLink: true },
                  { label: '職種', key: 'Kind' },
                  { label: '仕事内容', key: 'JobContent', isLongText: true },
                  { label: 'エリア', key: 'Area' },
                  { label: '就業場所', key: 'JobAddress' },
                  { label: '従業員数', key: 'Employee' },
                  { label: '設立年', key: 'Establishment' },
                  { label: '資本金', key: 'Capital' },
                  { label: '事業内容', key: 'CompanyContent', isLongText: true },
                  { label: '会社の特長', key: 'CompanyFeature', isLongText: true },
                  { label: '役職', key: 'RepresentativePost' },
                  { label: '代表者名', key: 'RepresentativeName' },
                  { label: '課係名、役職名', key: 'ChargePost' },
                  { label: '担当者', key: 'ChargeName' },
                  { label: '電話番号', key: 'Tel' },
                  { label: 'Eメール', key: 'Email' }
                ].map(({ label, key, isLink, isLongText }) => (
                  <div key={key} className="mb-2">
                    <label htmlFor={key} className="block text-sm font-medium text-gray-700">{label}</label>
                    {isEditing ? (
                      isLongText ? (
                        <textarea
                          id={key}
                          name={key}
                          value={editedInfo[key] as string}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          rows={3}
                        />
                      ) : (
                        <input
                          type="text"
                          id={key}
                          name={key}
                          value={editedInfo[key] as string}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                      )
                    ) : (
                      <p className="mt-1">
                        {isLink ? (
                          <a href={companyInfo[key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {companyInfo[key]}
                          </a>
                        ) : (
                          <>{companyInfo[key]}</>
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center">読み込み中...</p>
            )}
          </div>

          {/* Right Panel: AI Generated Content */}
          <div className="w-1/2 pl-4 border-l overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">送信文章</h2>
            <div className="mb-4">
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
              >
                AI生成
              </button>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              {generatedContent ? (
                <p className="whitespace-pre-wrap">{generatedContent}</p>
              ) : (
                <p className="text-gray-500">「AI生成」ボタンをクリックして生成してください。</p>
              )}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="absolute bottom-4 right-4 space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditedInfo(companyInfo)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                キャンセル
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              編集
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            閉じる
          </button>
        </div>
      </div>
    )
  }

  const handleAnalyze = async () => {
    setLoading3(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        alert('解析が完了しました')
      } else {
        alert('解析に失敗しました')
      }
    } catch (error) {
      console.error('Error executing script:', error)
      alert('解析中にエラーが発生しました')
    } finally {
      setLoading3(false)
    }
  }

  const handleAreaChange = (areaValue: number) => {
    const areaLabel = area.find(a => a.index === areaValue)?.label
    if (areaLabel) {
      setSelectedAreas(prev =>
        prev.includes(areaLabel) ? prev.filter(a => a !== areaLabel) : [...prev, areaLabel]
      )
    }
  }

  const handleSectorChange = (sectorValue: number) => {
    const sectorLabel = sector.find(s => s.index === sectorValue)?.label
    if (sectorLabel) {
      setSelectedSectors(prev =>
        prev.includes(sectorLabel) ? prev.filter(s => s !== sectorLabel) : [...prev, sectorLabel]
      )
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6 mb-4">
        <h2 className="text-xl font-bold mb-4">操作パネル</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleRunScript}
            disabled={loading1}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading1 ? 'お散歩中...' : 'お散歩開始'}
          </button>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(Number(e.target.value))}
          >
            {area.map((option) => (
              <option key={option.index} value={option.index}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(Number(e.target.value))}
          >
            {sector.map((option) => (
              <option key={option.index} value={option.index}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={loading3}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading3 ? '解析中...' : 'お問合せページ・営業禁止・入力フィールド解析'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">エリア選択</h2>
          <div className="h-64 overflow-y-auto pr-4">
            <div className="grid grid-cols-2 gap-2">
              {area.map((item) => (
                <div key={item.index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`area-${item.index}`}
                    checked={selectedAreas.includes(item.label)}
                    onChange={() => handleAreaChange(item.index)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <label htmlFor={`area-${item.index}`}>{item.label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">業種選択</h2>
          <div className="h-64 overflow-y-auto pr-4">
            <div className="grid grid-cols-1 gap-2">
              {sector.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`sector-${item.value}`}
                    checked={selectedSectors.includes(item.label)}
                    onChange={() => handleSectorChange(item.index)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <label htmlFor={`sector-${item.value}`}>{item.label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">検索結果</h2>
        <button
          onClick={handleSearch}
          disabled={loading2}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading2 ? '検索中...' : '検索'}
        </button>
        {result && result.length > 0 && (
        <p className="mb-2">検索結果: {result.length}件</p>
        )}
        <div className="h-64 overflow-y-auto">
          <ul className="space-y-2">
            {result.map((company, index) => (
              <li key={index} className="flex items-center">
                <button
                  onClick={() => setSelectedCompany(company.name)}
                  className="text-blue-600 hover:underline mr-2"
                >
                  {company.name}
                </button>
                {company.notice && (
                  <span className="text-sm text-red-500 ml-2">{company.notice}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {selectedCompany && (
        <CompanyInfoPopup
          companyName={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  )
}