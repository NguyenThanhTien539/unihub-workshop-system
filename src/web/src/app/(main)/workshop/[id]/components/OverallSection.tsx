import { Info, CheckCircle2 } from "lucide-react"

export const OverallSection = () => {
  return (
    <div className="flex flex-col gap-5">
      {/* About Section */}
      <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Về workshop này</h2>
        <p className="text-gray-600 leading-relaxed mb-8">
          Khám phá những kiến thức cơ bản về AI và Machine Learning. Tìm hiểu về các thuật toán phổ biến, ứng dụng thực tế và xu hướng công nghệ mới nhất trong lĩnh vực AI.
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="flex items-center gap-2 font-bold mb-4">
              <CheckCircle2 size={18} className="text-green-500" /> Bạn sẽ học được
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Kiến thức nền tảng về chủ đề chính</li>
              <li>• Kỹ năng thực hành qua case study thực tế</li>
              <li>• Kinh nghiệm từ chuyên gia hàng đầu</li>
              <li>• Networking với các bạn cùng sở thích</li>
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-bold mb-4">
              <Info size={18} className="text-blue-500" /> Yêu cầu tham gia
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Sinh viên đang theo học tại trường</li>
              <li>• Không yêu cầu kiến thức nền tảng</li>
              <li>• Mang laptop nếu có phần thực hành</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-8">Lịch trình workshop</h2>
        <div className="space-y-8 relative before:absolute before:left-[1.1rem] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
          {[
            { step: 1, title: 'Giới thiệu và Ice breaking', time: '30 phút', desc: 'Làm quen với diễn giả và các thành viên khác' },
            { step: 2, title: 'Phần lý thuyết chính', time: '60 phút', desc: 'Trình bày kiến thức nền tảng và case study' },
            { step: 3, title: 'Nghỉ giải lao', time: '15 phút', desc: '' },
            { step: 4, title: 'Q&A và kết thúc', time: '35 phút', desc: 'Giải đáp thắc mắc và networking' },
          ].map((item) => (
            <div key={item.step} className="relative pl-12">
              <div className="absolute left-0 w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold z-10 border-4 border-white">
                {item.step}
              </div>
              <div>
                <h4 className="font-bold">{item.title}</h4>
                <p className="text-sm text-gray-400 font-medium">{item.time}</p>
                {item.desc && <p className="text-sm text-gray-500 mt-1">{item.desc}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
