package io.github.yeobbun.attendancewidget

import com.sun.net.httpserver.HttpServer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import java.net.InetSocketAddress
import java.util.Base64

/** pending-fixture.json 은 출결 앱의 encrypt() 로 '시험용 비밀번호' 를 써서 잠근 것이다. */
class PendingTest {
    private val fixture = javaClass.getResource("/pending-fixture.json")!!.readText()

    @Test
    fun `출결 앱이 잠근 요약을 푼다`() {
        val s = Pending.parse(Pending.decrypt(fixture, "시험용 비밀번호"))
        assertEquals("2-3", s.className)
        assertEquals(listOf("결석계", "체험학습 보고서", "체험학습 신청서"), s.items.map { it.doc })
        assertEquals("3. 김하늘", s.items[0].who)
        assertEquals(null, s.items[0].deadline)
        assertEquals("2026-10-23", s.items[1].tripEnd)
    }

    @Test
    fun `비밀번호가 다르면 알려준다`() {
        val e = assertThrows(WidgetError::class.java) { Pending.decrypt(fixture, "틀림") }
        assertEquals("잠금 비밀번호가 출결 앱과 달라요.", e.message)
    }

    @Test
    fun `기한 지난 것을 위로, 다녀오기 전 보고서는 표시`() {
        val s = Pending.parse(Pending.decrypt(fixture, "시험용 비밀번호"))
        val sorted = s.sorted("2026-10-30")
        assertEquals("체험학습 신청서", sorted[0].doc)
        assertEquals("10/22(목) 체험학습 · 기한 10/30", s.items[1].detail("2026-10-30"))
        assertEquals("10/22(목) 체험학습 · 다녀온 후 · 기한 10/30", s.items[1].detail("2026-10-22"))
    }

    @Test
    fun `깃허브에서 받고, sha 가 같으면 건너뛴다`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        var auth: String? = null
        server.createContext("/repos/me/sync/contents/sync/pending.json") { ex ->
            auth = ex.requestHeaders.getFirst("Authorization")
            // 깃허브는 base64 를 60자마다 줄바꿈해서 준다
            val b64 = Base64.getMimeEncoder(60, "\n".toByteArray()).encodeToString(fixture.toByteArray())
            val body = """{"sha":"abc","content":"${b64.replace("\n", "\\n")}"}""".toByteArray()
            ex.sendResponseHeaders(200, body.size.toLong())
            ex.responseBody.use { it.write(body) }
        }
        server.start()
        try {
            GitHub.api = "http://127.0.0.1:${server.address.port}"
            val f = GitHub.fetchPending("me/sync", "tok", null)!!
            assertEquals("Bearer tok", auth)
            assertEquals("abc", f.sha)
            assertEquals(fixture, f.text)
            assertNull(GitHub.fetchPending("me/sync", "tok", "abc"))
        } finally {
            server.stop(0)
        }
    }
}
