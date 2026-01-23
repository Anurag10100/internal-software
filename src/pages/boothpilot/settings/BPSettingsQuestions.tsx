import React, { useEffect, useState } from 'react';
import {
  HelpCircle,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useBoothPilot } from '../../../context/BoothPilotContext';
import type { BPQualificationQuestion, BPQuestionCreate, BPQuestionUpdate } from '../../../types/boothpilot';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: BPQualificationQuestion;
  onSave: (data: BPQuestionCreate | BPQuestionUpdate) => Promise<void>;
  maxOrderIndex: number;
}

const QuestionModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  question,
  onSave,
  maxOrderIndex,
}) => {
  const [formData, setFormData] = useState({
    questionText: question?.questionText || '',
    questionType: question?.questionType || 'select',
    options: question?.options?.join('\n') || '',
    isRequired: question?.isRequired || false,
    orderIndex: question?.orderIndex || maxOrderIndex + 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (question) {
      setFormData({
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options?.join('\n') || '',
        isRequired: question.isRequired,
        orderIndex: question.orderIndex,
      });
    } else {
      setFormData({
        questionText: '',
        questionType: 'select',
        options: '',
        isRequired: false,
        orderIndex: maxOrderIndex + 1,
      });
    }
  }, [question, isOpen, maxOrderIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data: BPQuestionCreate | BPQuestionUpdate = {
      questionText: formData.questionText,
      questionType: formData.questionType as any,
      options: formData.options.split('\n').filter((o) => o.trim()),
      isRequired: formData.isRequired,
      orderIndex: formData.orderIndex,
    };

    await onSave(data);
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl transform transition-all sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {question ? 'Edit Question' : 'Add Question'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <input
                    type="text"
                    required
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    placeholder="e.g., What is your expected timeline?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    value={formData.questionType}
                    onChange={(e) => setFormData({ ...formData, questionType: e.target.value as 'text' | 'number' | 'select' | 'multiselect' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="select">Dropdown (Single Select)</option>
                    <option value="text">Text Input</option>
                    <option value="number">Number Input</option>
                  </select>
                </div>

                {formData.questionType === 'select' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options (one per line)
                    </label>
                    <textarea
                      rows={5}
                      value={formData.options}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter each option on a new line
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="isRequired" className="text-sm text-gray-700">
                    This question is required
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {question ? 'Save Changes' : 'Add Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const BPSettingsQuestions: React.FC = () => {
  const { questions, fetchQuestions, createQuestion, updateQuestion, deleteQuestion } = useBoothPilot();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BPQualificationQuestion | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      await fetchQuestions();
      setLoading(false);
    };
    load();
  }, [fetchQuestions]);

  const handleAdd = () => {
    setEditingQuestion(undefined);
    setModalOpen(true);
  };

  const handleEdit = (question: BPQualificationQuestion) => {
    setEditingQuestion(question);
    setModalOpen(true);
  };

  const handleSave = async (data: BPQuestionCreate | BPQuestionUpdate) => {
    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, data);
    } else {
      await createQuestion(data as BPQuestionCreate);
    }
  };

  const handleDelete = async (question: BPQualificationQuestion) => {
    if (!window.confirm(`Are you sure you want to delete "${question.questionText}"?`)) {
      return;
    }
    await deleteQuestion(question.id);
  };

  const handleMoveUp = async (question: BPQualificationQuestion) => {
    const currentIndex = questions.findIndex((q) => q.id === question.id);
    if (currentIndex <= 0) return;

    const prevQuestion = questions[currentIndex - 1];
    await updateQuestion(question.id, { orderIndex: prevQuestion.orderIndex });
    await updateQuestion(prevQuestion.id, { orderIndex: question.orderIndex });
    await fetchQuestions();
  };

  const handleMoveDown = async (question: BPQualificationQuestion) => {
    const currentIndex = questions.findIndex((q) => q.id === question.id);
    if (currentIndex >= questions.length - 1) return;

    const nextQuestion = questions[currentIndex + 1];
    await updateQuestion(question.id, { orderIndex: nextQuestion.orderIndex });
    await updateQuestion(nextQuestion.id, { orderIndex: question.orderIndex });
    await fetchQuestions();
  };

  const maxOrderIndex = Math.max(...questions.map((q) => q.orderIndex), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qualification Questions</h1>
          <p className="text-gray-500">Questions asked when qualifying leads</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-indigo-800">
          These questions help qualify leads and improve AI scoring. Answers are captured on the lead detail page and used for generating more accurate scores and follow-ups.
        </p>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {questions.length === 0 ? (
          <div className="p-8 text-center">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No questions configured</h3>
            <p className="text-gray-500 mb-4">Add qualification questions to better score your leads</p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {questions.map((question, index) => (
              <div key={question.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                {/* Order Controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(question)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(question)}
                    disabled={index === questions.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Question Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-gray-900">{question.questionText}</h3>
                    {question.isRequired && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>Type: {question.questionType}</span>
                    {question.questionType === 'select' && question.options.length > 0 && (
                      <span>{question.options.length} options</span>
                    )}
                  </div>
                  {question.questionType === 'select' && question.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {question.options.slice(0, 5).map((opt, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {opt}
                        </span>
                      ))}
                      {question.options.length > 5 && (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                          +{question.options.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(question)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(question)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <QuestionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        question={editingQuestion}
        onSave={handleSave}
        maxOrderIndex={maxOrderIndex}
      />
    </div>
  );
};

export default BPSettingsQuestions;
